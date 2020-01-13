#!/usr/bin/env node

const pkg = require('./package.json');
const log = require('yalm');
const config = require('yargs')
    .env('WEBHOOKS2MQTT')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('verbosity', 'possible values: "error", "warn", "info", "debug"')
    .describe('name', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('mqtt-user', 'username for MQTT connections')
    .describe('mqtt-pass', 'password for MQTT connections')
    .describe('http-port', 'port for the HTTP server to listen on')
    .describe('http-auth', 'username/password combination for basic http auth. Username and password seperated by space')
    .alias({
        h: 'help',
        m: 'mqtt-url',
        p: 'http-port',
        v: 'verbosity'
    })
    .default({
        name: 'webhooks',
        'mqtt-url': 'mqtt://127.0.0.1',
        'http-port': 8801
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

const authUsers = [];
if (typeof config.httpAuth === 'string') {
    let tmp = config.httpAuth.split(' ');
    
    if (tmp % 2) process.exit(2); // if not pairs were provided

    for (let i = 0; i < tmp.length; i += 2) {
        authUsers.push({username: tmp[i], password: tmp[i+1]});
    }
}
log.debug('authorized users', authUsers);

const server = restify.createServer();
server.use(restify.plugins.bodyParser({
    requestBodyOnGet: true
}));
server.use(restify.plugins.authorizationParser());

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
    log.debug('http <', req.path(), req.body, req.authorization);

    if (config.httpAuth) {
        if ('scheme' in req.authorization && req.authorization.scheme == 'Basic') {
            let authOk = false;
            for (let i = 0; i < authUsers.length; i++) {
                if (
                    req.authorization.basic.username == authUsers[i].username &&
                    req.authorization.basic.password == authUsers[i].password
                ) {
                    authOk = true;
                    break;
                }
            }

            if (!authOk) {
                log.warn('request not authorized', req.authorization);
                return;
            }
        }
    }

    const topic = config.name+'/status/'+req.path().substring(1);
    let message = req.body || 'null'
    mqtt.publish(topic, message, () => {
        res.send(req.body);
        next();
    });
}
