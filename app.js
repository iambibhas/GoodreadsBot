const TeleBot = require('telebot');
const XML2JSON = require('xml2json');
const request = require('request');
var redisclient = require('redis').createClient(process.env.REDIS_URL);
const bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN);
const gr_key = process.env.GOODREADS_KEY;
const gr_token = process.env.GOODREADS_TOKEN;

function getMessage(topbook) {
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
    return fullMessage;
}

bot.on(/^\/book (.+)$/, (msg, props) => {
    const text = props.match[1];
    console.log("===================");
    console.log("New Query: " + text);

    redisclient.get(text, function (err, reply) {
        if (reply === null) {
            // Didn't find any entry in cache
            console.log("cache miss");
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
                // set cache
                redisclient.set(text, JSON.stringify(topbook));

                var fullMessage = getMessage(topbook);
                return bot.sendMessage(msg.chat.id, fullMessage).catch((error) => {
                    console.log('Error:', error);
                });
            })
        } else {
            // cache hit!
            console.log("cache hit");
            topbook = JSON.parse(reply);
            var fullMessage = getMessage(topbook);
            return bot.sendMessage(msg.chat.id, fullMessage).catch((error) => {
                console.log('Error:', error);
            });
        }
    });

});

bot.start();
