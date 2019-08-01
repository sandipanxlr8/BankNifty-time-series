const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mysqlConnection = require("./DBconnection");

const app = express();

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

//Public variables
var tradingDates = [];
var tradingDate = [];
var expiryDates = [];
var expiryDate = [];
var niftyIndex = [];
var closesLow = [];
var closesHigh = [];
var priceCall = [];
var pricePut = [];
var sum = [];

app.get("/", function (req, res) {
    res.render("form");
});

app.post("/", async function (req, res) {

    // Date conversion to YYYY-MM-DD
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function formatDate(d) {
        var day = d.getDate();
        var month = d.getMonth();
        var year = d.getFullYear();

        day = day + "";
        month = month + 1 + "";

        if (day.length == 1) {
            day = "0" + day;
        }
        if (month.length == 1) {
            month = "0" + month;
        }

        return year + '-' + month + '-' + day;
    }

    var startDate = formatDate(new Date(Date.parse((req.body.startDate))));
    var endDate = formatDate(new Date(Date.parse((req.body.endDate))));
    var expiry = req.body.expiry;
    var priceType = req.body.priceType;
    console.log(startDate);
    console.log(endDate);
    console.log(expiry);
    console.log(priceType);


    //func to get Dates between the starting and ending date.
    function calDates() {
        await mysqlConnection.query(`SELECT Date FROM bank_nifty WHERE Date BETWEEN '${startDate}' AND '${endDate}'`, (err, rows, fields) => {
            if (err) {
                console.log(err);
            }

            else {
                tradingDates = JSON.parse(JSON.stringify(rows));
                console.log('first one .......... ' + tradingDates.length);
            }
        })
    }

    for (let index = 0; index < tradingDates.length; index++) {

        tradingDate = tradingDates[index][Date];
        console.log(tradingDate);
        console.log("For Trading day : " + tradingDate);

        async function calculation() {

            //Getting expiry dates for the trading date.
            mysqlConnection.query(`SELECT distinct Expiry FROM bank_nifty_calls WHERE Date = '${tradingDate}'`, (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                else {
                    expiryDates[index] = JSON.parse(JSON.stringify(rows));
                }
            })

            await Waiter(1000);
            //Initialising the expiryDate according to Expiry type.
            switch (expiry) {
                case 'Nearest':
                    expiryDate = expiryDates[index][0]["Expiry"];
                    break;
                case 'Next-to-Nearest':
                    expiryDate = expiryDates[index][1]["Expiry"];
                    break;

                case 'Farthest':
                    expiryDate = expiryDates[index][2]["Expiry"];
                    break;

                default:
                    expiryDate = expiryDates[index][0]["Expiry"];
                    break;
            }

            //Mysql for returning nifty index.
            mysqlConnection.query(`SELECT ${priceType} FROM bank_nifty WHERE Date = '${tradingDate}'`, (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                else {
                    niftyIndex[index] = JSON.parse(JSON.stringify(rows))[0][`${priceType}`];
                }
            })

            await Waiter(200);
            //initialising Closes(Low) and Closes(high).
            closesLow[index] = Math.floor(niftyIndex[index] / 100) * 100;
            closesHigh[index] = Math.ceil(niftyIndex[index] / 100) * 100;

            //Calulating Open Price (put)
            mysqlConnection.query("select " + `${priceType}` + " from bank_nifty_puts where Date='" + `${tradingDate}` + "' and Expiry='" + `${expiryDate}` + "' and `Strike Price`= " + `${closesLow[index]}` + " ;", (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                else {
                    pricePut[index] = JSON.parse(JSON.stringify(rows[0][`${priceType}`])); //
                }
            })

            //Calulating Open Price (call)
            mysqlConnection.query("select " + `${priceType}` + " from bank_nifty_calls where Date='" + `${tradingDate}` + "' and Expiry='" + `${expiryDate}` + "' and `Strike Price`= " + `${closesHigh[index]}` + ";", (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                else {
                    priceCall[index] = JSON.parse(JSON.stringify(rows[0][`${priceType}`])); //
                }
            })

            await Waiter(200);
            sum[index] = parseFloat(pricePut[index]) + parseFloat(priceCall[index]);
        }
        calculation();

        console.log("End of one Date ...................................................");


    }

    function loadTable() {

        res.render("table", {
            tradingDates: tradingDates,
            endDate: endDate,
            expiry: expiry,
            priceType: priceType,
            niftyIndex: niftyIndex,
            closesLow: closesLow,
            closesHigh: closesHigh,
            pricePut: pricePut,
            priceCall: priceCall,
            sum: sum

        });

    }
    calc();

    // console.log(expiryDates);
    // console.log(niftyIndex);
    // console.log(expiryDate);
    // console.log(pricePut);
    // console.log(tradingDates);



});

app.listen(3000, function () {
    console.log("App started at port 3000");
});

const Waiter = (t) => new Promise(function (resolve, reject) {
    setTimeout(function () {
        resolve()
    }, t)
})
