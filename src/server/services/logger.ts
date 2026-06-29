import winston from 'winston';

const { combine, timestamp, colorize, printf, json, splat } = winston.format;

const devFormat = combine(
    timestamp({ format: 'HH:mm:ss' }),
    splat(),
    colorize({ all: true }),
    printf(({ level, message, timestamp: ts, ...meta }) => {
        // strip the splat symbol so it doesn't clutter the meta output
        const { [Symbol.for('splat')]: _splat, ...rest } = meta as any;
        const metaStr = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
        return `${ts} ${level}: ${message}${metaStr}`;
    }),
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'http',
    format: process.env.NODE_ENV === 'production'
        ? combine(splat(), json())
        : devFormat,
    transports: [new winston.transports.Console()],
});

export default logger;
