# webhooks2mqtt

This is simple as possible! 

* connects to a MQTT Broker
* Starts a webserver 
* takes http request path as topic and body as payload for MQTT
* Works with GET and POST method
* Prepared to use with Docker 

## usage

Start server:

    docker run --rm -p 8801:8801 dersimn/webhooks2mqtt --mqtt-url mqtt://10.1.1.50

Connect MQTT client:

    mosquitto_sub -h 10.1.1.50 -t "webhooks/foo/bar"

Then open up your browser and type in:

    http://localhost:8801/foo/bar?test=message

In MQTT you will receive something similar to

    {
      "body": null,
      "query": "test=message",
      "headers": {
        "host": "localhost:8801",
        "upgrade-insecure-requests": "1",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Safari/605.1.15",
        "accept-language": "en-us",
        "accept-encoding": "gzip, deflate",
        "connection": "keep-alive"
      },
      "remoteAddress": "::1",
      "username": "anonymous"
    }

This works for payloads via GET URL params or POST body.

### Configuration

You can configure the project by using [these](https://github.com/dersimn/webhooks2mqtt/blob/d38c4580c3b1b520910c58e7b449ea8157084fcc/index.js#L6) parameters or environment variables for e.g.: `--mqtt-url mqtt://my.broker.local` or `WEBHOOKS2MQTT_MQTT_URL="mqtt://my.broker.local"`
