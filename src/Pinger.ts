import { Logger } from 'homebridge';
import { promise as ping, PingResponse } from 'ping';

export class Pinger {
  private static readonly NumberOfPings = 5;
  private static readonly TimeoutInSeconds = 1;
  private static readonly IntervalInMilliseconds = 2000;
  private readonly ipAddress: string;
  private readonly logger: Logger;
  private readonly callback: (isOnline: boolean) => void;
  private readonly history: Array<boolean>;
  private timer: NodeJS.Timeout | null;
  private pinging: boolean;
  private pingCallback!: (isOnline: boolean) => void;

  public constructor(ipAddress: string, logger: Logger, callback: (isOnline: boolean) => void) {
    this.ipAddress = ipAddress;
    this.logger = logger;
    this.callback = callback;
    this.history = new Array<boolean>();
    this.timer = null;
    this.pinging = false;
    this.resetCallback();
  }

  public start(): void {
    this.logger.debug('Starting pinger at an interval of %d milliseconds', Pinger.IntervalInMilliseconds);
    this.timer = setInterval(this.ping.bind(this), Pinger.IntervalInMilliseconds);
    this.pingCallback = this.callback;

    this.pingImmediate();
  }

  public stop(): void {
    this.logger.debug('Stopping pinger');
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.resetCallback();
  }

  private async ping(): Promise<void> {
    if (this.pinging) {
      return;
    }

    this.pinging = true;

    const response: PingResponse = await ping.probe(this.ipAddress, { timeout: Pinger.TimeoutInSeconds });
    this.pinging = false;

    this.history.push(response.alive);
    if (this.history.length > Pinger.NumberOfPings) {
      this.history.shift();
    }

    const positives = this.history.reduce((count, alive) => alive ? count + 1 : count, 0);

    // Assume all are negative if there are no positives
    if (positives === this.history.length) {
      this.pingCallback(true);
    } else if (positives === 0) {
      this.pingCallback(false);
    }
  }

  private async pingImmediate(): Promise<void> {
    // Timeout is given in seconds
    const response: PingResponse = await ping.probe(this.ipAddress, { timeout: Pinger.TimeoutInSeconds });
    this.pingCallback(response.alive);
  }

  private resetCallback(): void {
    // Dummy function to handle callbacks whenever the pinger is not enabled,
    // but some pings may still call back due to concurrency
    this.pingCallback = () => { /* Do nothing */ };
  }
}