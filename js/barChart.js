/*
*    barChart.js
*    Nyugdíjbiztosítás kalkulátor
*    BarChart
*/

BarChart = function (_parentElement, _variable, _title) {
    this.parentElement = _parentElement;
    this.variable = _variable;
    this.title = _title;

    this.initVis();
};

BarChart.prototype.initVis = function () {
    var vis = this;
    vis.margin = { left: 150, right: 20, top: 50, bottom: 20 };
    vis.height = 550 - vis.margin.top - vis.margin.bottom;
    vis.width = 800 - vis.margin.left - vis.margin.right;

    vis.svg = d3.select(vis.parentElement)
        .append("svg")
        .attr("width", vis.width + vis.margin.left + vis.margin.right)
        .attr("height", vis.height + vis.margin.top + vis.margin.bottom);
    vis.g = vis.svg.append("g")
        .attr("transform", "translate(" + vis.margin.left +
            ", " + vis.margin.top + ")");

    // Initialize tooltip
    vis.tip = d3.tip().attr('class', 'd3-tip').html(function (d) {
        var text = d3.format(",")(d.size) + " Ft"
        return text;
    });

    vis.t = () => { return d3.transition().duration(1000); }

    // X Label
    vis.g.append("text")
        .attr("y", vis.height + 50)
        .attr("x", vis.width / 2)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Cég");

    // Y Label
    vis.g.append("text")
        .attr("y", - 100)
        .attr("x", -(height / 2) + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Megtakarítás összesen (Ft)");

    vis.colour_scale = d3.scaleOrdinal()
        .range(["#002E83", "#0074C2", "#9FC84C", "#F70002", "#fe9929", "#017A3D", "#254186", "#BD1916",]);

    vis.companies = nestedCompanies.map(name => name.key);

    vis.x = d3.scaleBand()
        .domain(vis.companies)
        .range([0, vis.width])
        .padding(0.2);

    vis.y = d3.scaleLinear().range([vis.height, 0]);

    vis.yAxisCall = d3.axisLeft().ticks(6);
    vis.xAxisCall = d3.axisBottom();

    vis.xAxis = vis.g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + vis.height + ")");
    vis.yAxis = vis.g.append("g")
        .attr("class", "y axis");

    vis.g.append("text")
        .attr("class", "title")
        .attr("y", -35)
        .attr("x", -50)
        .attr("font-size", "14px")
        .attr("text-anchor", "start")
        .text(vis.title)

    vis.group = d3.select('.card-column').append("div").attr("class", "cards");
    vis.btn = d3.select('.download-btn');
    vis.selectedValues = d3.select('.selected-values').append('div');
    vis.savingsTitle = d3.select('.savings-title').append('div');

    vis.wrangleData();
};

BarChart.prototype.wrangleData = function () {
    var vis = this;
    // Invoke the tooltip
    vis.g.call(vis.tip);

    // Get the value of the datepicker input field
    vis.datePickerValue = $("#datepicker").datepicker('getDate');

    // Get the value of the monthly savings from the slider input fields
    vis.savingsVal = $("#saving-slider").slider("value");
    // vis.formatTime = d3.timeFormat("%Y/%m/%d");

    // Filter data based on selections
    var dateFrom = new Date(vis.datePickerValue);

    // Calculate age given the birth date from input, and today's date
    function calculateAge(dateFrom) {
        var ageDifMs = Date.now() - dateFrom.getTime();
        var ageDate = new Date(ageDifMs); // milliseconds from epoch
        return ageDate.getUTCFullYear() - 1970;
    }

    vis.age = calculateAge(dateFrom);
    // Calculate how many years left until 65th birthday
    vis.savingYears = 65 - vis.age;
    // Yearly savings
    vis.base = vis.savingsVal * 12;
    // Total savings
    vis.savingsTotal = vis.base * vis.savingYears;
    console.log("Életkor: " + vis.age + "\n" +
        "Megtakarítási évek száma: " + (vis.savingYears) + "\n" +
        "Megtakarítás havonta: " + vis.savingsVal + " Ft" + "\n" +
        "Befektetés összesen: " + d3.format(",")(vis.savingsTotal) + "Ft"
    );

    vis.dataFiltered = nestedCompanies.map(function (name) {
        return {
            name: name.key,
            // Calculate savings with interest
            size: (name.values.reduce(function (accumulator, current) {
                // Interest
                function calcSumInterest(base, interest) {
                    return base * (1 + interest / 100);
                }

                // Compund interest
                function compoundInterest(base, interest, year) {
                    var total = [base];
                    for (var i = 1; i < year; i++) {
                        var base = calcSumInterest(base, interest);
                        total.push(base);
                    }

                    function getSum(totals, num) {
                        return totals + num;
                    }

                    let totalSum;
                    totalSum = total.reduce(getSum, 0)
                    console.log(totalSum)
                    return Math.round(totalSum);
                };

                // Yearly tax benefit 
                function calcTaxBenefit(base, interest) {
                    return base * (interest / 100);
                }
                let taxBenefit = calcTaxBenefit(vis.base, 20);

                // Yearly tax benefit at max. 130,000 
                let maxTaxBenefit = Math.min(taxBenefit, 130000);

                // 3. évtől kapná meg a hozamot
                let compoundedInterest = (vis.base * 3) + compoundInterest((vis.base + maxTaxBenefit), current[vis.variable], (vis.savingYears - 3));

                console.log("Biztosító: " + name.key + "\n" + "Megtakarítás összesen " + d3.format(",")(compoundedInterest) + " Ft" + "\n" + "Adójóváírás évente " + maxTaxBenefit + " Ft");

                return compoundedInterest;
            }, 0))
        }
    })

    vis.updateVis();
};

BarChart.prototype.updateVis = function () {
    var vis = this;

    // Update scales
    // y scale starts from the minimal size value * 0.9 to see the difference better on the barchart
    vis.y.domain([0.9 * d3.min(vis.dataFiltered, (d) => { return +d.size; }), d3.max(vis.dataFiltered, (d) => { return +d.size; })]);
    vis.max_value = d3.max(vis.dataFiltered, (d) => { return +d.size; });
    vis.colour_scale.domain([0, vis.max_value]);

    // Update axes
    vis.xAxisCall.scale(vis.x);
    vis.xAxis.transition(vis.t()).call(vis.xAxisCall);
    vis.yAxisCall.scale(vis.y);
    vis.yAxis.transition(vis.t()).call(vis.yAxisCall);

    // JOIN new data with old elements.
    vis.rects = vis.g.selectAll("rect").data(vis.dataFiltered, function (d) {
        return d.category;
    });

    // EXIT old elements not present in new data.
    vis.rects.exit()
        .attr("class", "exit")
        .transition(vis.t())
        .attr("height", 0)
        .attr("y", vis.height)
        .style("fill-opacity", "0.1")
        .remove();

    // UPDATE old elements present in new data.
    vis.rects.attr("class", "update")
        .transition(vis.t())
        .attr("y", function (d) { return vis.y(d.size); })
        .attr("height", function (d) { return (vis.height - vis.y(d.size)); })
        .attr("x", function (d) { return vis.x(d.name) })
        .attr("width", vis.x.bandwidth)

    // ENTER new elements present in new data.
    vis.rects.enter()
        .append("rect")
        .attr("class", "enter")
        .attr("y", function (d) { return vis.y(d.size); })
        .attr("height", function (d) { return (vis.height - vis.y(d.size)); })
        .attr("x", function (d) { return vis.x(d.name) })
        .attr("width", vis.x.bandwidth)
        .attr("fill", function (d) { return vis.colour_scale(d.size) })
        .on("mouseover", vis.tip.show)
        .on("mouseout", vis.tip.hide)
        // TODO: vissza scrollozzon, ha rákattintok egy kártyára
        .on("click", function scrollTo(d) {
            $(document.body).animate({
                'scrollTop': $('#' + d.name).offset().top
            }, 1200)
        });

    vis.selectedValues
        .each(function () {
            d3.select(this).html(
                `<div class="selected-body">
                    <h5>${"Megtakarítási évek száma: " + vis.savingYears + " év"}</h5>
                    <h5 class="card-title>${"Befektetés összesen: " + vis.savingsTotal + " Ft"}</h5>
                </div>`)
        });

    // <h5 class="card-text">${"Havi megtakarítás összege: " + d3.format(",")(vis.savingsVal) + " Ft"}</h5>

    vis.savingsTitle
        .each(function () {
            d3.select(this).html(
                `<div class="selected-body">
                <p>${"Megtakarítás adójóváírással és kamatos kamattal összesen:"}</p>
                </div>`)
        });

    // Export button to save svg
    vis.btn
        .each(function () {
            d3.select(this).html(
                `<input id="export" name="downloadButton" class="btn btn-info" type="button" value="Grafikon letöltése" />`
            )
        })

    d3.select('#export').on('click', function () {
        var config = {
            filename: 'megtakaritas_grafikon',
        }
        d3_save_svg.save(d3.select('svg').node(), config);
    });


    // Renders card list
    vis.cards = vis.group
        .selectAll('.card')
        .data(vis.dataFiltered)

    vis.cards.exit()
        .attr("class", "exit")
        .transition(vis.t())
        .style("fill-opacity", "0.1")
        .remove()

    vis.cards
        .transition(vis.t())
        .each(function (d) {
            d3.select(this).html(
                `<div class="card-body" id="${d.name}">
                    <h5 class="card-title">${d.name}</h5>
                    <p class="card-text">${d3.format(",")(d.size) + " Ft"}</p>
                </div>`)
        });

    vis.cards
        .enter()
        .append("div") // append div here
        .attr("class", "enter")
        .classed("card", true)
        .on("click", function scrollTo(d) {
            $(document.body).animate({
                'scrollTop': 0
            }, 1200)
        })
        .each(function (d) {
            d3.select(this).html(
                `<div class="card-body" id="${d.name}">
                    <h5 class="card-title">${d.name}</h5>
                    <p class="card-text">${d3.format(",")(d.size) + " Ft"}</p>
                    <img class="arrow" src="/assets/arrow.svg" />
                </div>`)
        });


    // Add scroll top top button
    // vis.up = vis.g.selectAll("#js-up")

    // vis.up
    //     .on("click", function scrollTo(d) {
    //         $(document.body).animate({
    //             'scrollTop': 0
    //         }, 1200)
    //     })
};
