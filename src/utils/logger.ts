export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const now = new Date();
    const timestamp = now.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${formattedArgs}`;
  }

  info(message: string, ...args: any[]): void {
    const msg = this.formatMessage('INFO', message, ...args);
    process.stdout.write(msg + '\n');
  }

  error(message: string, ...args: any[]): void {
    const msg = this.formatMessage('ERROR', message, ...args);
    process.stderr.write(msg + '\n');
  }

  warn(message: string, ...args: any[]): void {
    const msg = this.formatMessage('WARN', message, ...args);
    process.stderr.write(msg + '\n');
  }

  debug(message: string, ...args: any[]): void {
    const msg = this.formatMessage('DEBUG', message, ...args);
    process.stdout.write(msg + '\n');
  }
}
