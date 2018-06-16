# BookInfoBot for Telegram

This is a simple bot that runs on Heroku and searches for books on Goodreads.

Mine is running at http://t.me/bookdetails_bot

## Usage

Send this to the bot in PM or in a group where the bot is added.

    /book <search term>

## Develop/Contribute

 - Run `npm install`
 - Install [Heroku cli](https://devcenter.heroku.com/articles/heroku-cli)
 - Run `heroku login` and login
 - To run locally, create a file `.env` and put these in it -

        GOODREADS_KEY=<key>
        GOODREADS_TOKEN=<token>
        TELEGRAM_BOT_TOKEN=<bot:token>

 - Then run `heroku local web`
 - To run on heroku server, follow heroku tutorial to connect the forked repo with your heroku account
 - Then set the secret config -

        heroku config:set GOODREADS_KEY=<key> -a <app-name>
        heroku config:set GOODREADS_TOKEN=<token> -a <app-name>
        heroku config:set TELEGRAM_BOT_TOKEN=<bot:token> -a <app-name>

 - Then deploy on heroku using your preferred method.
