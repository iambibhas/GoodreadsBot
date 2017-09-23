/* server. js */
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var http = require('http');
var parser = require('xml2json');
const axios = require('axios')

app.use(bodyParser.json()); /* for parsing application/json */
app.use(bodyParser.urlencoded({
    extended: true
})); /*for parsing application/x-www-form-urlencoded*/

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

/* Reading config */

var fs = require("fs"), json;
json_config = getConfig('config.json');
var key = json_config.key;
var token = json_config.token;

/*This is the route the API will call*/

app.post('/new-message', function(req, res) {

    try {
        const {message} = req.body

        /* Each message contains "text" and a "chat" object, which has an "id" 
        which is the chat id */

        if (message == undefined || !message || message.text == undefined) {

            return res.end()
        }

        var input_received = JSON.stringify(message.text);
        input_received = input_received.split("/book ")[1];
        if (input_received == undefined) {

            return res.end()

        }

        input_received = input_received.trim().replaceAll('"','');
        var book = encodeURI(input_received);
        var data_to_send_back = "Blooming Shore - onstart!";

        /*The url we want is: 
        'https://www.goodreads.com/search.xml?key='<key>'&q='<book_name>*/

        /*code for an HTTP request */

        var options = {
            host: 'www.goodreads.com',
            path: '/search.xml?key=' + key + '&q=' + book
        };

        callback = function(response) {
            var str = '';

            /* Append all chunks of data received into variable str */
            response.on('data', function(chunk) {
                str += chunk;
            });

            /* Now we've receieved all data and we can work with it */
            response.on('end', function() {
                data_to_send_back = str;
                
                /* Process data_to_send_back */

                var jsonText = JSON.parse(parser.toJson(data_to_send_back));
                data_to_send_back = jsonText;
                var topBook = '';


                /* If we received an empty response - i.e. no matching results */
                if (jsonText.GoodreadsResponse.search.results == "") {
                    /* Send a response to the bot */
                    axios.post('https://api.telegram.org/bot' + token + '/sendMessage', {
                            chat_id: message.chat.id,
                            text: "No results found for your search query!"
                        })
                        .then(response => {
                            /* When the message was successfully posted */
                            console.log('Message posted')
                            res.end('ok')
                        })
                        .catch(err => {
                            /* In case of Error */
                            console.log('Error :', err)
                            res.end('Error :' + err)
                        });

                    return res.end();
                }

                /* If we receive a just one book */
                if (jsonText.GoodreadsResponse.search.results.work[0] == undefined) {
                    topBook = jsonText.GoodreadsResponse.search.results.work.best_book;

                } else { /* More than one book received */
                    topBook = jsonText.GoodreadsResponse.search.results.work[0].best_book;
                }

                /* Extract relevant information from the book such as Id, Name, Author

                We need to separately query for book description now

                */
                var bookId = JSON.stringify(topBook.id.$t);
                bookId = bookId.replaceAll('"','');
                bookId = Number(bookId)
                var bookName = JSON.stringify(topBook.title).replaceAll('"','');;
                var authorName = JSON.stringify(topBook.author.name).replaceAll('"','');;
                var bookDesc = "N/A";

                /* For debugging purposes only 
                var url_part_2 = 'www.goodreads.com' + '/book/show/' + bookId + '.xml?key=' + key
                console.log("Name of the book : " + bookName);
                console.log("Author of the book: " + authorName);
                console.log("Book Id : " + bookId);
                console.log("full url - " + url_part_2);

                /* Query for the Book's Description using its id

                    URL : https://www.goodreads.com/book/show/31128898.xml?key='<key>'
                    
                    */

                var options_new = {
                    host: 'www.goodreads.com',
                    path: '/book/show/' + bookId + '.xml?key=' + key
                };

                callback_new = function(response_new) {
                    var str_new = '';

                    /* Build response */
                    response_new.on('data', function(chunk_new) {
                        str_new += chunk_new;
                    });

                    /* Extract relevant information about the book */
                    response_new.on('end', function() {
                        var bookDetails = JSON.parse(parser.toJson(str_new));
                        bookDesc = JSON.stringify(bookDetails.GoodreadsResponse.book.description).replaceAll('"','');
                        var num_pages = JSON.stringify(bookDetails.GoodreadsResponse.book.num_pages).replaceAll('"','');
                        var url = JSON.stringify(bookDetails.GoodreadsResponse.book.url).replaceAll('"','');
                        var average_rating = JSON.stringify(bookDetails.GoodreadsResponse.book.average_rating).replaceAll('"','');

                        var fullMessage = "Name of the book : " + bookName + "\nAuthor of the book : " + authorName +
                            "\nNumber of Pages : " + num_pages +
                            "\nAverage Rating : " + average_rating +
                            "\nURL : " + url +
                            "\n\nDescription :\n" + bookDesc + "\n";


                        /* Post the response to the Telegram Bot */

                        axios.post('https://api.telegram.org/bot' + token + '/sendMessage', {
                                chat_id: message.chat.id,
                                text: fullMessage
                            })
                            .then(response => {
                                /* Message successfully posted */
                                console.log('Message posted')
                                res.end('ok')
                            })
                            .catch(err => {
                                /* In case of an error */
                                console.log('Error :', err)
                                res.end('Error :' + err)
                            });


                    });
                    /* In case of an error */
                    response_new.on('error', function(e_new) {
                        console.log("ERROR!!! - " + e_new);

                    });
                }
                /* Make the HTTP Request */
                http.request(options_new, callback_new).end();

            });
            /* In case of an error */
            response.on('error', function(e) {
                console.log("ERROR!!! - " + e);

            });
        }
        /* Make the HTTP Request */
        var x = http.request(options, callback).end();



    } /* Exception Handling */
    catch (err) {
        console.log("An error occurred : \n\n" + err);
    }
});
/* Finally, start our server */
app.listen(process.env.PORT || 5000, function() {
    console.log('Bot is online and listening for requests');
});

/* Helper functions to read JSON for config */

function readJsonFileSync(filepath, encoding) {

    if (typeof(encoding) == 'undefined') {
        encoding = 'utf8';
    }
    var file = fs.readFileSync(filepath, encoding);
    return JSON.parse(file);
}

function getConfig(file) {

    return readJsonFileSync(file);
}

//assume that config.json is in application root