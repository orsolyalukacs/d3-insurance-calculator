/*
*    main.js
*    Nyugdíjbiztosítás kalkulátor
*/

var parseTime = d3.timeParse("%d/%m/%Y");
var formatTime = d3.timeFormat("%Y/%m/%d");
var savingPerMonth;
var dateToday = new Date();
var yrRange = (dateToday.getFullYear() - 60) + ":" + (dateToday.getFullYear() - 18);

// Add jquery datepicker
$("#datepicker").datepicker({
    showOtherMonths: true,
    selectOtherMonths: true,
    changeMonth: true,
    changeYear: true,
    yearRange: yrRange,
    dateFormat: 'yy-mm-dd',
    onSelect: function (dateText, inst) {
        var dateObject = $(this).datepicker('getDate');
        console.log("date object " + dateObject);
        // $(this).datepicker('setDate', $(this).val());
        $("#dateLabel").text(formatTime(dateObject));
        updateChart();
    }
});

$("#saving-slider").slider({
    range: false,
    min: 12000,
    max: 100000,
    step: 1000,
    value: 25000,
    slide: function (event, ui) {
        $("#savingLabel").text(ui.value + " Ft");
        $("#saving-value").text("Havi megtakarítás összege: " + d3.format(",")(ui.value) + " Ft");
        savingPerMonth = ui.value;
        updateChart();
    }
});

d3.json("data/fictive_companies.json").then(function(data) {
    data.map(function (d) {
        d.interest = +d.interest
        return d
    })
    companies = data;

    nestedCompanies = d3.nest()
        .key((d) => {
            return d.name;
        })
        .entries(companies)

    // TODO: only create barchart if an input value has changed

    if (!document.getElementsByTagName('svg').length) {
        // create a new object from the BarChart class 
        // takes two arguments, a string that is a parent of the element, and an array of data 
        barChart = new BarChart("#barchart-area", "interest", "A nyugdíbiztosítás lejárati összege biztosító szerint: ");
    }
});

function updateChart() {
    barChart.wrangleData();
}
