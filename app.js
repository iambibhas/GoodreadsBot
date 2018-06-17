const TeleBot = require('telebot');
const XML2JSON = require('xml2json');
const request = require('request');
const bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN);
const gr_key = process.env.GOODREADS_KEY;
const gr_token = process.env.GOODREADS_TOKEN;

bot.on(/^\/book (.+)$/, (msg, props) => {
    const text = props.match[1];
    console.log(msg);
    console.log(text);

    var gr_url = "http://www.goodreads.com/search/index.xml?key=" + gr_key + "&q=" + text;
    request(gr_url, (error, response, body) => {
        var json_response = JSON.parse(XML2JSON.toJson(body));
        var topbook = null;

        if (json_response.GoodreadsResponse.search.results == "") {
            return bot.sendMessage(msg.from.id, "No book found! :(")
        } else if (json_response.GoodreadsResponse.search.results.work[0] == undefined) {
            topbook = json_response.GoodreadsResponse.search.results.work;
        } else { /* More than one book received */
            topbook = json_response.GoodreadsResponse.search.results.work[0];
        }
        var rating = 0.0;
        if (typeof topbook.average_rating == 'object') {
            rating = topbook.average_rating['$t'];
        } else {
            rating = topbook.average_rating;
        }
        var fullMessage = "Name: " + topbook.best_book.title + "\nAuthor: " + topbook.best_book.author.name +
                            "\nAverage Rating : " + rating +
                            "\nURL : https://www.goodreads.com/book/show/" + topbook.best_book.id['$t'] +
                            // "\nLibgen URL : http://libgen.io/search.php?lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def&req=" + encodeURIComponent(topbook.best_book.title) + "+" + encodeURIComponent(topbook.best_book.author.name) +
                            "\n";

        return bot.sendMessage(msg.chat.id, fullMessage).catch((error) => {
            console.log('Error:', error);
        });
    })
    // return bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id });
});

bot.start();
