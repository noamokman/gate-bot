# gate-bot

This is a Telegram bot that allows authorized users to open a gate. It uses the Telegraf framework for Telegram bot development.

## Features
- Authorization system: Only authorized users can open the gate.
- Request access: Users can request access to open the gate. The request is sent to the admins who can either allow or deny the request.
- Open the gate: Authorized users can open the gate by sending the `/open` command.
- Check authorization: Users can check if they are authorized to open the gate by sending the `/check_authorization` command.
- Get the door code: Authorized users can get the door code by sending the `/door_code` command.

## Setup
### Docker compose

```yml
version: '3.9'
services:
  gate-bot:
    image: noamokman/gate-bot
    volumes:
      - .:/service
    ports:
      - 3000:3000
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - ADMIN_USER_IDS=${ADMIN_USER_IDS}
      - DOOR_CODE=${DOOR_CODE}
      - GATE_URL=${GATE_URL}
      - DB_PATH=${DB_PATH}
```

### Manual
1. Clone the repository.
2. Install the dependencies by running `yarn install`.
3. Create a `.env` file in the root directory and set the following environment variables:
  - `BOT_TOKEN`: Your Telegram bot token.
  - `ADMIN_USER_IDS`: A comma-separated list of Telegram user IDs of the admins.
  - `DOOR_CODE`: The door code.
  - `GATE_URL`: The endpoint that gets called when an authorized user runs /open.
  - `DB_PATH`: The path where to save the data.
4. Run the bot by running `yarn start`.


## Commands
- `/start`: Start the bot.
- `/help`: Get help on how to use the bot.
- `/check_authorization`: Check if you are allowed to open the gate.
- `/request_access`: Request access to open the gate.
- `/open`: Open the gate.
- `/door_code`: Get the door code.