const express = require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mysqlConnection = require("./DBconnection");

const app = express();

app.use(express.static("public"));
app.use(bodyparser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

//Public variables
var Data;
var tradingDate = [];
var expiryDate = [];
var niftyIndex = [];
var closesLow = [];
var closesHigh = [];
var priceCall = [];
var pricePut = [];
var sum = [];

//Public Function
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

app.get("/", function (req, res) {
    res.render("form");
});

app.post("/", async function (req, res) {



    var startDate = formatDate(new Date(Date.parse((req.body.startDate))));
    var endDate = formatDate(new Date(Date.parse((req.body.endDate))));
    var expiry = req.body.expiry;
    var priceType = req.body.priceType;
    console.log(startDate);
    console.log(endDate);
    console.log(expiry);
    console.log(priceType);



    function calData() {

        //Getting expiry dates for the trading date.
        mysqlConnection.query("select" +
            " distinct t1.Date , t1.Expiry , t1.`Nifty Index`, t1.`CLosest (Low)`, t1.`Closest (High)`, 'PE' as 'Option Type p' , t1.`Price puts`, 'CE' as 'Option Type c' , t2.`Price calls` " +
            "from " +
            "(select distinct bank_nifty.Date , bank_nifty_puts.Expiry , bank_nifty." + `${priceType}` + " as 'Nifty Index' , FLOOR(bank_nifty." + `${priceType}` + " / 100) * 100 as 'CLosest (Low)', CEIL(bank_nifty." + `${priceType}` + " / 100) * 100 as 'Closest (High)' , bank_nifty_puts." + `${priceType}` + " as 'Price puts' from bank_nifty_puts JOIN bank_nifty where bank_nifty_puts.Date = bank_nifty.Date and bank_nifty.Date between " + `'${startDate}'` + " and " + `'${endDate}'` + " and bank_nifty_puts.`Strike Price` in (FLOOR(bank_nifty." + `${priceType}` + "/100)*100)) as t1 " +
            "left join " +
            "(select  distinct bank_nifty.Date , bank_nifty_calls.Expiry , bank_nifty." + `${priceType}` + " as 'Nifty Index' , FLOOR(bank_nifty." + `${priceType}` + " / 100) * 100 as 'CLosest (Low)', CEIL(bank_nifty." + `${priceType}` + " / 100) * 100 as 'Closest (High)', bank_nifty_calls." + `${priceType}` + " as 'Price calls' from bank_nifty_calls JOIN bank_nifty where bank_nifty_calls.Date = bank_nifty.Date and bank_nifty.Date between " + `'${startDate}'` + " and " + `'${endDate}'` + "  and bank_nifty_calls.`Strike Price` = (CEIL(bank_nifty." + `${priceType}` + " / 100) * 100)) as t2 " +
            "on (t1.Date = t2.Date and t1.Expiry = t2.Expiry);"

            , (err, rows, fields) => {
                if (err) {
                    console.log(err);
                }

                else {

                    console.log(JSON.parse(JSON.stringify(rows[0])));

                    for (let i = 0; i < JSON.parse(JSON.stringify(rows)).length; i++) {
                        tradingDate[i] = formatDate(new Date(JSON.parse(JSON.stringify(rows[i]['Date']))));
                        expiryDate[i] = JSON.parse(JSON.stringify(rows[i]['Expiry']));
                        niftyIndex[i] = JSON.parse(JSON.stringify(rows[i]['Nifty Index']));
                        closesLow[i] = JSON.parse(JSON.stringify(rows[i]['CLosest (Low)']));
                        closesHigh[i] = JSON.parse(JSON.stringify(rows[i]['Closest (High)']));
                        pricePut[i] = JSON.parse(JSON.stringify(rows[i]['Price puts']));
                        priceCall[i] = JSON.parse(JSON.stringify(rows[i]['Price calls']));
                        sum[i] = parseFloat(pricePut[i]) + parseFloat(priceCall[i]);
                    }

                }

            })
    }
    calData();
    function loadTable() {

        res.render("table", {
            tradingDate: tradingDate,
            expiryDate: expiryDate,
            priceType: priceType,
            niftyIndex: niftyIndex,
            closesLow: closesLow,
            closesHigh: closesHigh,
            pricePut: pricePut,
            priceCall: priceCall,
            sum: sum

        });

    }
    loadTable();


});

app.listen(3000, function () {
    console.log("App started at port 3000");
});

const Waiter = (t) => new Promise(function (resolve, reject) {
    setTimeout(function () {
        resolve()
    }, t)
})
