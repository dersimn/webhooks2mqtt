#!/usr/bin/env node

const pkg = require('./package.json');
const log = require('yalm');
const config = require('yargs')
    .env('webhooks')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('name', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('mqtt-user', 'username for MQTT connections')
    .describe('mqtt-pass', 'password for MQTT connections')
    .describe('http-port', 'port for the HTTP server to listen on')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        p: 'http-port',
        v: 'verbosity'
    })
    .default({
        name: 'webhooks',
        'mqtt-url': 'mqtt://127.0.0.1',
        'http-port': 9001
    })
    .demandOption([
    ])
    .version()
    .help('help')
    .argv;

const restify = require('restify');
const MqttSmarthome = require('mqtt-smarthome-connect');

log.setLevel(config.verbosity);
log.info(pkg.name + ' ' + pkg.version + ' starting');
log.debug('loaded config: ', config);

const server = restify.createServer();
server.use(restify.plugins.bodyParser({
    requestBodyOnGet: true
}));

server.get('*', controller);
server.post('*', controller);

log.info('mqtt trying to connect', config.mqttUrl);
const mqtt = new MqttSmarthome(config.mqttUrl, {
    logger: log,
    will: {topic: config.name + '/maintenance/online', payload: 'false', retain: true},
    username: config.mqttUser,
    password: config.mqttPass
});
mqtt.connect();

mqtt.on('connect', () => {
    log.info('mqtt connected', config.mqttUrl);
    mqtt.publish(config.name + '/maintenance/online', true, {retain: true});

    server.listen(config.httpPort, function() {
        log.info('http server', server.name, 'listening on url', server.url);
        mqtt.publish(config.name + '/maintenance/http/online', true, {retain: true});
    });
});

mqtt.on('close', () => {
    process.exit(1); // restart docker container then
})

function controller(req, res, next) {
    const topic = config.name+'/status/'+req.path().substring(1);
    let message = req.body || 'null'
    mqtt.publish(topic, message, () => {
        log.debug('mqtt >', topic, message);
        res.send(req.body);
        next();
    });
}
