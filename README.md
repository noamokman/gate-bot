# gate-bot

This is a Telegram bot that allows authorized users to open a gate. It uses the Telegraf framework for Telegram bot development and supports both HTTP and MQTT for integration with Home Assistant.

## Features

- **Authorization System**: Only authorized users can open the gate.
- **Request Access**: Users can request access to open the gate. The request is sent to the admins, who can either allow or deny the request.
- **Open the Gate**: Authorized users can open the gate by sending the `/open` command.
- **Check Authorization**: Users can check if they are authorized to open the gate by sending the `/check_authorization` command.
- **Get the Door Code**: Authorized users can get the door code by sending the `/door_code` command.
- **Supports Two Modes**:
  - **HTTP Mode**: Calls an HTTP endpoint to open the gate.
  - **MQTT Mode**: Uses MQTT to communicate with Home Assistant.

## Setup

### Docker Compose

```yml
version: '3.8'

services:
  gate-bot:
    image: noamokman/gate-bot
    container_name: gate-bot
    environment:
      DB_PATH: /config/db.json
      BOT_TOKEN: ${BOT_TOKEN}
      ADMIN_USER_IDS: ${ADMIN_USER_IDS}
      GATE_URL: ${GATE_URL} # Required for HTTP mode
      DOOR_CODE: ${DOOR_CODE}
      MQTT_URL: ${MQTT_URL} # Required for MQTT mode
      MQTT_COMMAND_TOPIC: ${MQTT_COMMAND_TOPIC} # Required for MQTT mode
      MQTT_DISCOVERY_TOPIC: ${MQTT_DISCOVERY_TOPIC} # Required for MQTT mode
    volumes:
      - ./config/:/config
    restart: unless-stopped
```

### Manual Setup

1. Clone the repository.
2. Install the dependencies:
   ```sh
   yarn install
   ```
3. Create a `.env` file in the root directory and set the following environment variables:

- `BOT_TOKEN`: Your Telegram bot token.
- `ADMIN_USER_IDS`: A comma-separated list of Telegram user IDs of the admins.
- `DOOR_CODE`: The door code.
- **For HTTP Mode:**
  - `GATE_URL`: The endpoint that gets called when an authorized user runs `/open`.
- **For MQTT Mode:**
  - `MQTT_URL`: The MQTT broker URL.
  - `MQTT_COMMAND_TOPIC`: The MQTT topic used to send open commands.
  - `MQTT_DISCOVERY_TOPIC`: The MQTT topic used for Home Assistant discovery.

4. Run the bot:
   ```sh
   yarn start
   ```

## Commands

- `/start`: Start the bot.
- `/help`: Get help on how to use the bot.
- `/check_authorization`: Check if you are allowed to open the gate.
- `/request_access`: Request access to open the gate.
- `/open`: Open the gate.
- `/door_code`: Get the door code.

## MQTT Integration

### **Home Assistant Discovery**

The bot automatically publishes an MQTT discovery message so Home Assistant can detect it as a button. The discovery topic is set in the environment variable `MQTT_DISCOVERY_TOPIC`.

Example MQTT discovery topic:

```
homeassistant/button/gate_bot_button/config
```

Example payload sent to Home Assistant:

```json
{
  "name": "Gate Bot Button",
  "command_topic": "home/garage/command",
  "payload_press": "open",
  "unique_id": "gate_bot_button",
  "device": { "identifiers": ["gate_bot"], "name": "Gate Bot", "manufacturer": "Custom", "model": "Gate Bot" }
}
```

### **Publishing MQTT Commands**

When the bot receives the `/open` command, it publishes an MQTT message to the command topic defined by `MQTT_COMMAND_TOPIC`.

Example message published:

```

topic: home/garage/command
payload: "open"

```

This allows Home Assistant to trigger the gate opening automatically.
