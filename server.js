// Modules
const fs = require("fs");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const axios = require('axios');


// Global variables to keep track of login status
let signedInStatus = false;
let username = "";
let firstName = "";
let joke = "";

// mongodb+srv://mhan10242019:qgryVzKwpRoZLFYJ@cluster0.jkd2y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// MongoDB setup
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.jkd2y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

 /* Our database and collection */
 const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

 /****** DO NOT MODIFY FROM THIS POINT ONE ******/
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

async function connectDB() {
    try {
        await client.connect();
    } catch (err) {
        console.error("Failed to connect", err);
    }
}

connectDB();

process.stdin.setEncoding("utf-8");

// Express
const portNumber = 5500;
const app = express();
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, '/')));


console.log(`Web server started and running at http://localhost:5500`);

// WELCOME PAGE 
app.get("/", async (request, response) => { 
    if (signedInStatus) {
        response.render("index_in", { firstName, joke });
    } else {
        response.render("index_welcome");
    }
    
}); 

// CREATE AN ACCOUNT PAGE
app.get("/createAccount", (request, response) => {
    signedInStatus = false;
    username = "";
    
    response.render("create_account");
});

app.post("/createAccount", async (request, response) => {
    let { firstName_create_acct, lastName_create_acct, email_create_acct, username_create_acct, password_create_acct} = request.body;

    if (firstName_create_acct == "" || lastName_create_acct == "" || email_create_acct == "" || username_create_acct == "" || password_create_acct == "") {
        // Source: https://www.w3schools.com/js/js_window_location.asp
        response.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Alert</title>
            </head>
            <body>
                <script>
                alert('Please fill in all fields.');
                window.location.href = '/';
                </script>
            </body>
            </html>
        `);

    } else {
        // Encode password
        const salt = await bcrypt.genSalt();
        const hashedPass = await bcrypt.hash(password_create_acct, salt);

        await insertUser(client, databaseAndCollection, firstName_create_acct, lastName_create_acct, email_create_acct, username_create_acct, hashedPass);

        // Set login status to true
        signedInStatus = true;
        username = "";

        response.render("index_in", { firstName, joke });
    }

});

// ABOUT PAGE
app.get("/about", (request, response) => {
    let signButton;

    if (signedInStatus) {
        signButton = `<input type="button" value="Sign out" id="accountTabButton">`;
    } else {
        signButton = `<input type="button" value="Sign in" id="accountTabButton">`;
    }

    response.render("about", { signButton });
});

// ADD APP PAGE
app.get("/addApplication", async (request, response) => {
    if (signedInStatus) {
        // Get names of existing companies
        let companiesLst = await buildCompaniesList(client, databaseAndCollection, username);

        response.render("add_app", { companiesLst });

    } else {
        // Source: https://www.w3schools.com/js/js_window_location.asp
        response.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Alert Example</title>
            </head>
            <body>
                <script>
                alert('Please create an account or sign into an existing account.');
                window.location.href = '/';
                </script>
            </body>
            </html>
        `);

    }
    
});

app.post("/addApplication", async (request, response) => {
    let { companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo } = request.body;

    await updateApplication(client, databaseAndCollection, username, companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo);

    // Get names of existing companies
    let companiesLst = await buildCompaniesList(client, databaseAndCollection, username);

    response.render("add_app", { companiesLst });

});

// EDIT APP
app.post("/editApplication", async (request, response) => {
    let { companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo } = request.body; 


    await updateFields(client, databaseAndCollection, username, companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo);

    // Get names of existing companies
    let companiesLst = await buildCompaniesList(client, databaseAndCollection, username);

    response.render("add_app", { companiesLst });

});

// REMOVE APP
app.post("/removeApplication", async(request, response) => {
    let { companyName } = request.body;
    
    await removeApp(client, databaseAndCollection, username, companyName);

    // Get names of existing companies
    let companiesLst = await buildCompaniesList(client, databaseAndCollection, username);

    response.render("add_app", { companiesLst });

});

// REMOVE ALL
app.post("/removeAll", async(request, response) => {

    await clearCollection(client, databaseAndCollection, username);

    // Get names of existing companies
    let companiesLst = await buildCompaniesList(client, databaseAndCollection, username);

    response.render("add_app", { companiesLst });
});

// DISPLAY PAGE
app.get("/displayApplication", async (request, response) => {
    if (signedInStatus) {
        let collapsibleList = await buildDisplay(client, databaseAndCollection, username);

        response.render("display", { collapsibleList });
    } else {
        // Source: https://www.w3schools.com/js/js_window_location.asp
        response.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Alert Example</title>
            </head>
            <body>
                <script>
                alert('Please create an account or sign into an existing account.');
                window.location.href = '/';
                </script>
            </body>
            </html>
        `);
    }
    
});

// RESOURCES PAGE
app.get("/resources", (request, response) => {
    let signButton;

    if (signedInStatus) {
        signButton = `<input type="button" value="Sign out" id="accountTabButton">`;
    } else {
        signButton = `<input type="button" value="Sign in" id="accountTabButton">`;
    }

    response.render("resources", { signButton });
});

// SIGN IN PAGE
app.get("/account", (request, response) => {
    if (!signedInStatus) {
        response.render("sign_in");
    } else {
        signedInStatus = false;
        username = "";
        response.render("index_welcome");
    }
    
});

app.post("/account", async (request, response) => {
    let { username_sign_in, password_sign_in } = request.body;

    const result = await accountCheck(client, databaseAndCollection, username_sign_in, password_sign_in);

    if (result != null) {
        signedInStatus = true;
        username = username_sign_in;

        let result = await getEntry(client, databaseAndCollection, username);
        firstName = result.firstName;

        joke = await getJoke();

        response.render("index_in", { firstName, joke });
    } else {
        // Source: https://www.w3schools.com/js/js_window_location.asp
        response.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Alert Example</title>
            </head>
            <body>
                <script>
                alert('Username or password is incorrect. Please try again.');
                window.location.href = '/account';
                </script>
            </body>
            </html>
        `);
    }

});

// GENERATE NEW JOKE
app.post('/get-joke', async (request, response) => {
    joke = await getJoke();
    response.render("index_in", { firstName, joke });
});

// SEARCH JOB
app.get('/search', (request, response) => {
    let signButton;
    let displayTable = "";

    if (signedInStatus) {
        signButton = `<input type="button" value="Sign out" id="accountTabButton">`;
    } else {
        signButton = `<input type="button" value="Sign in" id="accountTabButton">`;
    }

    response.render("search", { signButton, displayTable });

});

app.post('/search', async (request, response) => {
    let signButton;
    let { title, location } = request.body;
    let displayTable = await searchJob(title, location);

    if (signedInStatus) {
        signButton = `<input type="button" value="Sign out" id="accountTabButton">`;
    } else {
        signButton = `<input type="button" value="Sign in" id="accountTabButton">`;
    }

    response.render("search", { signButton, displayTable });

});

async function insertUser(client, databaseAndCollection, firstName, lastName, email, username, password) {
    try {
        let newUser = { firstName : firstName, lastName : lastName, email : email, username : username, password : password, applications : [] };
        
        await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newUser);

    } catch (e) {
        console.error(e);
    } 
}

async function accountCheck(client, databaseAndCollection, user, pass) {
    try {
        let filter = { username : user };
        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .findOne(filter);

        const { password : hashedPassword } = result;
        const passMatch = await bcrypt.compare(pass, hashedPassword);

        if (passMatch) {
            return true;
            
        } else {
            console.log("FAILED");
            return false;
        }

    } catch (e) {
        console.error(e);
    } 
}

async function getEntry(client, databaseAndCollection, user) {
    try {
        let filter = { username : user };
        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .findOne(filter);

        if (result) {
            return result;
        } else {    
            return null;
        }

    } catch (e) {
        console.error(e);
    }
}

async function updateApplication(client, databaseAndCollection, user, companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo) {
    try {
        const newApp = { companyName : companyName, 
                         type : jobType, 
                         position : position,
                         salary : salary, 
                         location : location,
                         url : jobUrl, 
                         dateSubmitted : dateSubmitted,
                         status : jobStatus,
                         extraInfo : extraInfo
                        };

        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .updateOne({ username : user }, 
                                        { $push: { applications : newApp } } );


    } catch (e) {
        console.error(e);
    }
}

async function buildDisplay(client, databaseAndCollection, user) {
    try {
        let userInfo = await getEntry(client, databaseAndCollection, user);
        // Collapsible menu source: https://www.w3schools.com/howto/howto_js_collapsible.asp
        let menu = "";

        userInfo.applications.forEach(entry => {
            // Construct button
            menu += `<button type="button" class="collapsible">${entry.companyName}</button>`;

            // Add div
            menu += `<div class="content">`;

            // Construct table
            menu += `<table>`;

            // Fill in table with info
            menu += `<tr>
                        <th>Status</th>
                        <td>${entry.status}</td>
                    </tr>
                    <tr>
                        <th>Type</th>
                        <td>${entry.type}</td>
                    </tr>
                    <tr>
                        <th>Position</th>
                        <td>${entry.position}</td>
                    </tr>
                    <tr>
                        <th>Salary</th>
                        <td>$${entry.salary}</td>
                    </tr>
                    <tr>
                        <th>Location</th>
                        <td>${entry.location}</td>
                    </tr>
                    <tr>
                        <th>Data Submitted</th>
                        <td>${entry.dateSubmitted}</td>
                    </tr>
                    <tr>
                        <th>Additional Information</th>
                        <td>${entry.extraInfo}</td>
                    </tr>`;

            // Close table
            menu += `</table>`;

            // Close div
            menu += `</div>`;
        });

        return menu;
        
    } catch (e) {
        console.error(e);
    }
}

async function buildCompaniesList(client, databaseAndCollection, user) {
    try {
        let userInfo = await getEntry(client, databaseAndCollection, user);
        let selections = "";

        if (userInfo.applications.length != 0) {
            userInfo.applications.forEach(entry => {
                selections += `<option value="${entry.companyName}">${entry.companyName}</option>`;
            });
        } 
        
        return selections;

    } catch (e) {
        console.error(e);
    }
}

async function updateFields(client, databaseAndCollection, user, companyName, jobType, position, salary, location, jobUrl, dateSubmitted, jobStatus, extraInfo) {
    try {
        let fieldsToUpdate = {};

        if (jobType != null) {
            fieldsToUpdate["applications.$.type"] = jobType;
        }

        if (position != "") {
            fieldsToUpdate["applications.$.position"] = position;
        }

        if (salary != "") {
            fieldsToUpdate["applications.$.salary"] = salary;
        }

        if (location != null) {
            fieldsToUpdate["applications.$.location"] = location;
        }

        if (jobUrl != "") {
            fieldsToUpdate["applications.$.url"] = url;
        }

        if (dateSubmitted != "") {
            fieldsToUpdate["applications.$.dateSubmitted"] = dateSubmitted;
        }

        if (jobStatus != null) {
            fieldsToUpdate["applications.$.status"] = jobStatus;
        }

        if (extraInfo != "") {
            fieldsToUpdate["applications.$.extraInfo"] = extraInfo;
        }

        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .updateOne({ username : user, "applications.companyName" : companyName }, 
                                        { $set: fieldsToUpdate } );

    } catch (e) {
        console.error(e);
    }
}

async function getJoke() {
    // API -> Generate dad joke
    const options = {
        method: 'GET',
        url: 'https://daddyjokes.p.rapidapi.com/random',
        headers: {
          'x-rapidapi-key': 'e62ab2663dmsha7922178cca0fc6p10145ejsn2c74afb274e0',
          'x-rapidapi-host': 'daddyjokes.p.rapidapi.com'
        }
      };
      

    try {
        const response = await axios.request(options);
        return response.data.joke;
    } catch (error) {
        console.error(error);
    }

}

async function removeApp(client, databaseAndCollection, user, companyName) {
    try {
        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .updateOne({ username : user, "applications.companyName" : companyName }, 
                                        { $pull : { applications : { companyName : companyName }}});
    } catch (e) {
        console.error(e);
    }
}

async function clearCollection(client, databaseAndCollection, user) {
    try {
        const result = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .updateOne({ username : user},
                                    { $set : { applications : [] }});
    } catch (e) {
        console.error(e);
    }
}

async function searchJob(title, location) {
    const options = {
        method: 'GET',
        url: 'https://active-jobs-db.p.rapidapi.com/active-ats-7d',
        params: {
          title_filter: `"${title}"`,
          location_filter: `"${location}"`
        },
        headers: {
          'x-rapidapi-key': '557e35bb02msh4a57227c85398fap12a7dejsnec1fb42796d6',
          'x-rapidapi-host': 'active-jobs-db.p.rapidapi.com'
        }
      };
      
      
      try {
          const response = await axios.request(options);
        //   console.log(response.data);
          let displayTable = `<table>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Company</th>
                                        <th>Job Link</th>
                                    </tr>
                                </thead>`;

          displayTable += `<tbody>`;
    
          response.data.forEach(entry => {
            displayTable += `<tr>
                                <td>${entry.title}</td>
                                <td>${entry.organization}</td>
                                <td><a href="${entry.url}">${entry.url}</a></td>
                             </tr>`;
          });

          displayTable += `</tbody></table>`;
          return displayTable;

      } catch (error) {
          console.error(error);
      }
}


// Command line interpreter
app.listen(portNumber);
const prompt = "Stop to shutdown the server: ";
process.stdout.write(prompt);

process.stdin.on("readable", function () {
    const userInput = process.stdin.read();

    if (userInput === "stop") {
        console.log("Shutting down the server");
        process.exit(0);

    } else {
        process.stdout.write(`Invalid command: ${userInput}`);
    }

    process.stdout.write(prompt);
    process.stdin.resume();
});