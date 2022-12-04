import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IConfiguration } from './IConfiguration';
import { JvcTvPlatform } from './JvcTvPlatform';
import { Pinger } from './Pinger';
import { TVState } from './TVState';
import * as wol from 'wake_on_lan';
import * as http from 'http';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */

export class JvcTvPowerAccessory {
  private readonly service: Service;
  private readonly pinger: Pinger;
  private state: TVState;

  public constructor(
    private readonly platform: JvcTvPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: IConfiguration,
  ) {
    this.state = TVState.Offline;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'JVC')
      .setCharacteristic(this.platform.Characteristic.Model, 'JVC TV')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, config.mac!);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, config.name);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb
    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below

    this.pinger = new Pinger(this.config.ip, this.platform.log, this.onPing.bind(this));
    this.pinger.start();
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  private async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.state === TVState.Online || this.state === TVState.WakingUp;

    this.platform.log.debug('Get Characteristic On ->', isOn);
    this.platform.log.debug('CurrentState ->', TVState[this.state]);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  private async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.platform.log.debug('Set Characteristic On ->', value);
    this.platform.log.debug('CurrentState ->', TVState[this.state]);

    const isOnline = this.state === TVState.Online;
    this.platform.log.debug('IsOnline ->', isOnline);

    // Don't allow user to change the state when waking up or shutting down
    if (this.state === TVState.WakingUp || this.state === TVState.ShuttingDown) {
      this.platform.log.debug('Ignored due to current state ->', TVState[this.state]);
      return;
    }

    // Homebridge provides its states as numbers (0 / 1)
    const shouldBeOnline = Boolean(value);

    // Debouncing - no change is necessary if we're currently in the correct state
    if (shouldBeOnline === isOnline) {
      this.platform.log.debug('Device already', isOnline ? 'online' : 'offline');
      return;
    }

    if (shouldBeOnline) {
      this.powerOn();
    } else {
      this.powerOff();
    }
  }

  private powerOn(): void {
    this.platform.log.info('Turning on device');

    wol.wake(this.config.mac, null, error => {
      if (error) {
        this.platform.log.error('An error occured while turning on device:', error);
      }
    });
  }

  private powerOff(): void {
    this.platform.log.info('Turning off device');

    const payload = '<remote><key code=1012/></remote>';
    const requestOptions: http.RequestOptions = {
      host: this.config.ip,
      port: 56789,
      path: '/apps/SmartCenter',
      method: 'POST',
      headers: {
        'Content-Length': Buffer.byteLength(payload),
        'Content-Type': 'text/plain; charset=ISO-8859-1',
        'Connection': 'keep-alive',
      },
    };
    const request = http.request(requestOptions);

    this.platform.log.debug('Sending request', requestOptions);

    try {
      request.write(payload);
      request.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.platform.log.error(message);
    }
  }

  private onPing(isOnline): void {
    if (isOnline && this.state !== TVState.Online) {
      // The device has been turned on
      this.platform.log.debug('Pinger saw device online. Setting state to Online.');
      this.changeState(TVState.Online);
    } else if (!isOnline && this.state !== TVState.Offline) {
      // The device has gone offline
      this.platform.log.debug('Pinger stopped seeing device. Settings state to Offline.');
      this.changeState(TVState.Offline);
    }
  }

  private changeState(state: TVState): void {
    // Debouncing - only react to a change if it has actually changed
    if (state !== this.state) {
      this.platform.log.info('Device is %s', TVState[state]);
      this.state = state;

      // Trigger change in homebridge
      this.service.updateCharacteristic(this.platform.Characteristic.On, state === TVState.Online);
    }
  }
}