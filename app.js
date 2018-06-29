const TeleBot = require('telebot');
const XML2JSON = require('xml2json');
const request = require('request');
var redisclient = require('redis').createClient(process.env.REDIS_URL);
const bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN);
const gr_key = process.env.GOODREADS_KEY;
const gr_token = process.env.GOODREADS_TOKEN;

function getMessage(topbook) {
    var rating = 0.0;
    if (typeof topbook.average_rating === 'object') {
        rating = topbook.average_rating['$t'];
    } else {
        rating = topbook.average_rating;
    }

    var description = '';
    if (typeof topbook.description !== 'object') {
        description = topbook.description;
    }

    var publication_year = '';
    if (typeof topbook.publication_year === 'object') {
        publication_year = topbook.original_publication_year['$t'];
    } else {
        publication_year = topbook.publication_year;
    }

    description = description.replace(/\<br \/\>/g, "\n").replace(/<(?:.|\n)*?>/gm, '');

    var fullMessage = `<b>${topbook.best_book.title}</b> (${publication_year})
by <i>${topbook.best_book.author.name}</i> - ⭐️ ${rating}

${description}

Goodreads URL: https://www.goodreads.com/book/show/${topbook.best_book.id['$t']}`;
    return fullMessage;
}

bot.on(/^\/book (.+)$/, (msg, props) => {
    const text = props.match[1];
    console.log("===================");
    console.log("New Book Query: " + text);

    redisclient.get(text.toLowerCase(), function (err, reply) {
        if (reply === null) {
            // Didn't find any entry in cache
            console.log("cache miss");
            var gr_url = "http://www.goodreads.com/search/index.xml?key=" + gr_key + "&q=" + encodeURIComponent(text);
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

                var gr_book_details_url = "https://www.goodreads.com/book/show/" + topbook.best_book.id['$t'] + ".xml?key=" + gr_key;
                request.get(gr_book_details_url, (error, response, body) => {
                    var json_book_response = JSON.parse(XML2JSON.toJson(body));
                    topbook.description = json_book_response.GoodreadsResponse.book.description;
                    topbook.publication_year = json_book_response.GoodreadsResponse.book.publication_year;

                    // set cache
                    redisclient.set(text.toLowerCase(), JSON.stringify(topbook));

                    var fullMessage = getMessage(topbook);

                    return bot.sendMessage(msg.chat.id, fullMessage, {parseMode: 'HTML'}).catch((error) => {
                        console.log('Error:', error);
                    });
                })
            });
        } else {
            // cache hit!
            console.log("cache hit");
            topbook = JSON.parse(reply);
            var fullMessage = getMessage(topbook);
            return bot.sendMessage(msg.chat.id, fullMessage, {parseMode: 'HTML'}).catch((error) => {
                console.log('Error:', error);
            });
        }
    });

});

bot.start();
