
// ••••••••••••••PKG DEPENDENCIES••••••••••
//
// routing assist
const express = require("express");
// http calls
const request = require("request");
// parses a str into JSON
const bodyParser = require("body-parser");
// logs request details
const logger = require("morgan");
// creates mongodb schemas
const mongoose = require("mongoose");
// works w/ file & directory paths
const path = require("path");
// Model is the M in MVC file structure
// Note.js is a data model in the model folder
// ??? what is a data model
const Note = require("./models/Note.js");
// Article.js is a data model
const Article = require("./models/Article.js");
// for web scraping
const cheerio = require("cheerio");
// initialize Handlebars
const exphbs = require("express-handlebars");
//

// ••••••••••••••DEFINE PORT
//
// ??? via .env?
// https://stackoverflow.com/questions/18864677/what-is-process-env-port-in-node-js

// When hosting an app on Heroku, Nodejitsu or AWS,
// the host may config the process.env.PORT var
// process.env.PORT || 3000 means:
// use the environment var PORT or 3000 if there's nothing there.

// pass the app.listen, or to app.set('port', ...), and that makes your server be able to accept a parameter from the environment what port to listen on.

// If you pass 3000 hard-coded to app.listen(), you're always listening on port 3000, which might be just for you, or not, depending on your requirements and the requirements of the environment in which you're running your server.

// Amazon's Elastic Beanstalk does this. If you try to set a static port value like 3000 instead of process.env.PORT || 3000 where 3000 is your static setting, then your application will result in a 500 gateway error because Amazon is configuring the port for you.
let port = process.env.PORT || 3000




// ••••••••••••••INITIALIZE EXPRESS ROUTING PKG
//
let expressApp = express();



// ••••••••••••••MONGOOSE CREATES DB PROMISE
//
// set mongoose to create a
// db schema built w/ JS ES6 Promise?
// Promise is an async operation & its resulting value
mongoose.Promise = Promise;


// ••••••••••••••MORGAN LOGGER TO LOG REQUESTS
//
// what is "dev"?
// https://gist.github.com/leommoore/7524073
//  the logger middleware generates a detailed log.
// The logger supports 4 log formats: default, short ,tiny, and dev.
// Each of these predefined formats show various amounts of detail.
expressApp.use(logger("dev"));



// ••••••••••••••BODY-PARSER PARSES REQUEST
//
// parses a str into JSON that you can extract info from
// https://www.quora.com/What-exactly-does-body-parser-do-with-express-js-and-why-do-I-need-it
// https://stackoverflow.com/questions/29960764/what-does-extended-mean-in-express-4-0
expressApp.use(bodyParser.urlencoded({
  extended: false
}));




// bookmark01

// ••••••••••••••MAKE PUBLIC A STATIC DIR FOLDER
//
// https://www.tutorialspoint.com/expressjs/expressjs_static_files.htm
// Static files are server files that clients download.
// Create a new directory, public.
// Express, by default does not allow you to serve static files. You need to enable it using the following built-in middleware.
expressApp.use(express.static("public"));




// ••••••••••••••CREATE HANDLEBARS TEMPLATE
//
// express template engine enables
// you to use static template files in your app.
// The template engine replaces vars in a template file with actual values,
// and transforms the template into an HTML file sent to the client.
// express engine() has 2 params
// ??? param 2 is an obj that will go into param 1 - "handlebars"
expressApp.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));



// ••••••••••••••SET HANDLEBARS AS VIEW ENGINE
//
// ??? ask about params
expressApp.set("view engine", "handlebars");


// bookmark02

// ••••••••••••••MONGOOSE DB CONFIG
//
// creates mongodb schemas
mongoose.connect(process.env.MONGOD_URI);



// ••••••••••••••DEFINE DB CONNECTION
//
// mongoose.connect("mongodb://localhost/mongoscraper")
// mongoose connection is assigned to the db var
// https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/mongoose






let db = mongoose.connection;




// ••••••••••••••SHOW MONGOOSE CONNECTION ERROR
//
// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// ••••••••••••••SHOW MONGOOSE CONNECTION SUCCESS
//
// Once logged in to the db via mongoose, log a success message
// ???? ask about the 1st param "open"
db.once("open", function() {
  console.log("Mike's Mongoose connection successful!");
});
// bookmark03





// ••••••••••••••GET ROUTE FOR ARTICLE.JS
//
// What are “res” and “req” parameters in Express functions?
// https://stackoverflow.com/questions/4696283/what-are-res-and-req-parameters-in-express-functions

//GET requests to render Handlebars pages
expressApp.get("/", function(request, response) {
  Article.find({"saved": false}, function(error, data) {
    let hbsObject = {
      article: data
    };
    console.log(hbsObject);
    response.render("home", hbsObject);
  });
});

// bookmark04


// ••••••••••••••GET ROUTE FOR NOTE.JS
//
expressApp.get("/saved", function(request, response) {
  Article.find({"saved": true}).populate("notes").exec(function(error, articles) {
    let hbsObject = {
      article: articles
    };
    response.render("saved", hbsObject);
  });
});

// bookmark05


// ••••••••••••••GET ROUTE TO SCRAPE NYTIMES
//
expressApp.get("/scrape", function(request, response) {

// request-grab html body from nytimes.com
  request("https://www.nytimes.com/", function(error, response, html) {


// load html body into cheerio's $ for shorthand selector
    let $ = cheerio.load(html);

// grab every h2 within an article tag, and do the following:
// grab & iterate thru every article tag
    $("article").each( function(i, element ) {

// Save an empty result object
      let result = {};

// Add title & summary of every link, and save them as properties of the result object
      result.title = $(this).children("h2").text();
      result.summary = $(this).children(".summary").text();
      result.link = $(this).children("h2").children("a").attr("href");

// Using our Article model, create a new entry
// This effectively passes the result object to the entry (and the title and link)
      let entry = new Article(result);

// Now, save that entry to the db
      entry.save(function(error, doc) {
// Log any errors
        if (error) {
          console.log(error);
        }
// Or console.log the doc
        else {
          console.log(doc);
        }
      });

    });
// Tell browser that we finished scraping the text
        response.send("Scrape Complete");
  });

});

// bookmark06


// ••••••••••GET ROUTE TO FIND ALL MONGODB ARTICLES
//
expressApp.get("/articles", function(request, response) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      response.json(doc);
    }
  });
});

// bookmark07

// ••••••••••GET ROUTE TO GRAB DB ARTICLES VIA OBJECT ID

// ObjectId is a mongodb field
expressApp.get("/articles/:id", function(request, response) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": request.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      response.json(doc);
    }
  });
});

// bookmark08

// ••••••••••POST ROUTE TO SAVE AN ARTICLE

// Save an article
expressApp.post("/articles/save/:id", function(request, response) {
      // Use the article id to find and update its saved boolean
      Article.findOneAndUpdate({ "_id": request.params.id }, { "saved": true})
      // Execute the above query
      .exec(function(error, doc) {
        // Log any errors
        if (error) {
          console.log(error);
        }
        else {
          // Or send the document to the browser
          response.send(doc);
        }
      });
});

// bookmark09

// ••••••••••POST ROUTE TO DELETE AN ARTICLE

// Delete an article
expressApp.post("/articles/delete/:id", function(request, response) {
      // Use the article id to find and update its saved boolean
      Article.findOneAndUpdate({ "_id": request.params.id }, {"saved": false, "notes": []})
      // Execute the above query
      .exec(function(error, doc) {
        // Log any errors
        if (error) {
          console.log(error);
        }
        else {
          // Or send the document to the browser
          response.send(doc);
        }
      });
});

// bookmark10

// ••••••••••POST ROUTE TO CREATE NEW NOTE
//
// Create a new note
expressApp.post("/notes/save/:id", function(request, response) {
  // Create a new note and pass the request.body to the entry
  let newNote = new Note({
    body: request.body.text,
    article: request.params.id
  });
  console.log(request.body)
  // And save the new note the db
  newNote.save(function(error, note) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's notes
      Article.findOneAndUpdate({ "_id": request.params.id }, {$push: { "notes": note } })
      // Execute the above query
      .exec(function(error) {
        // Log any errorors
        if (error) {
          console.log(error);
          response.send(error);
        }
        else {
          // Or send the note to the browser
          response.send(note);
        }
      });
    }
  });
});

// bookmark11

// ••••••••••DELETE ROUTE TO DELETE A NOTE
//
expressApp.delete("/notes/delete/:note_id/:article_id", function(request, response) {
  // Use the note id to find and delete it
  Note.findOneAndRemove({ "_id": request.params.note_id }, function(error) {
    // Log any errors
    if (error) {
      console.log(error);
      response.send(error);
    }
    else {
      Article.findOneAndUpdate({ "_id": request.params.article_id }, {$pull: {"notes": request.params.note_id}})
       // Execute the above query
        .exec(function(error) {
          // Log any errors
          if (error) {
            console.log(error);
            response.send(error);
          }
          else {
            // Or send the note to the browser
            response.send("Note Deleted");
          }
        });
    }
  });
});

//  ••••••••••LISTEN ON PORT
//
expressApp.listen(port, function() {
  console.log("Hey Mike! The app is running on port " + port);
});








