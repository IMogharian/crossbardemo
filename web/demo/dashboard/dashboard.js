/******************************************************************************
 *
 *  Copyright 2012 Tavendo GmbH. All rights reserved.
 *
 ******************************************************************************/

/***********
 *    websocket connection to appliance
 ***********/

var wsuri = get_appliance_url("hub-websocket", "ws://localhost/ws");
var sess = null;
var retryCount = 0;
var retryDelay = 2;
var activity_icons = { "food":"glossy-black-icon-food-beverage-food-pizza.png", "call":"telephone_icon.png"};


// highlight timer objects

var highlight_timeout = 300;

var simple_timer = {};
simple_timer.targetClass = ".simple_indicator";
simple_timer.highlighted = false;
simple_timer.timeout = highlight_timeout;

var bars_timer = {};
bars_timer.targetClass = ".bar_chart";
bars_timer.highlighted = false;
bars_timer.timeout = highlight_timeout;

var hundred_timer = {};
hundred_timer.targetClass = ".hundred_bar";
hundred_timer.highlighted = false;
hundred_timer.timeout = highlight_timeout;

var bullet_timer = {};
bullet_timer.targetClass = ".bullet_graph";
bullet_timer.highlighted = false;
bullet_timer.timeout = highlight_timeout;

var pie_timer = {};
pie_timer.targetClass = ".pie_chart";
pie_timer.highlighted = false;
pie_timer.timeout = highlight_timeout;

var activity_timer = {};
activity_timer.targetClass = ".activity_stream";
activity_timer.highlighted = false;
activity_timer.timeout = highlight_timeout;


// initial thresholds for display in the activity stream
//onSale.revenue_threshold = 1000;
//onSale.unit_threshold = 8;
var revenue_threshold = 0;
var unit_threshold = 0;


// colors for the widgets

// pie chart sections

var chartColor01 = "#444";
var chartColor02 = "#777";
var chartColor03 = "#aaa";
var chartColor04 = "#ddd";

// bar chart bars
var barColor01 = "#444";
var barColor02 = "#888";
var barColor03 = "#ccc";

// hundred bar sections
var hundredColor01 = "#444";
var hundredColor02 = "#888";
var hundredColor03 = "#ccc";

// bullet graph section
var bulletColor01= "#eee";
var bulletColor02= "#ccc";
var bulletColor03= "#aaa";
var bulletColor04= "#888";

//var bar_chart_height = 105;

function connect() {

   ab._Deferred = jQuery.Deferred;

   updateStatusline("Connecting ..");

   ab.connect(wsuri,

      function (session) {
         sess = session;
         onConnect0();
      },

      function (code, reason, detail) {

         sess = null;
         switch (code) {
            case ab.CONNECTION_UNSUPPORTED:
               window.location = "https://webmq.tavendo.de:9090/help/browsers";
               //alert("Browser does not support WebSocket");
               break;
            case ab.CONNECTION_CLOSED:
               window.location.reload();
               break;
            default:

               retryCount = retryCount + 1;
               updateStatusline("Connection lost. Reconnecting (" + retryCount + ") in " + retryDelay + " secs ..");

               break;
         }
      },

      {'maxRetries': 60, 'retryDelay': 2000}
   );
}


function onConnect0() {
   sess.authreq().then(function () {
      sess.auth().then(onAuth, function (error) {
         updateStatusline("Auth Request failed: " + error.desc);
      });
   }, function (error) {
      updateStatusline("Auth failed: " + error.desc);
   });
}

function onAuth(permissions) {

   updateStatusline("Connected to " + wsuri);
   retryCount = 0;

   ///** define session prefixes ***/
   sess.prefix("event", "http://autobahn.tavendo.de/public/demo/dashboard#");
   sess.prefix("sales", "http://autobahn.tavendo.de/public/demo/dashboard#");


   // subscribe to events
   sess.subscribe("event:switch-dashboard", onDashboardSwitch)

   // sales events
   sess.subscribe("sales:revenue", onRevenue);
   sess.subscribe("sales:revenue-by-product", onRevenueByProduct);
   sess.subscribe("sales:units-by-product", onUnitsByProduct);
   sess.subscribe("sales:revenue-by-region", onRevenueByRegion);
   sess.subscribe("sales:asp-by-region", onAspByRegion);
   sess.subscribe("sales:sale", onSale);

   sess.subscribe("sales:revenue-threshold", onRevenueThresholdChanged);
   sess.subscribe("sales:unit-threshold", onUnitThresholdChanged);

   onDashboardSwitch(null, 1);


   // Oracle Dashboard Demo
   sess.prefix("orasales", "http://tavendo.de/webmq/demo/dashboard#");

   // sales events
   sess.subscribe("orasales:revenue", onRevenue);
   sess.subscribe("orasales:revenue-by-product", onRevenueByProduct);
   sess.subscribe("orasales:units-by-product", onUnitsByProduct);
   sess.subscribe("orasales:revenue-by-region", onRevenueByRegion);
   sess.subscribe("orasales:asp-by-region", onAspByRegion);
   sess.subscribe("orasales:sale", onSale);

   sess.subscribe("orasales:revenue-threshold", onRevenueThresholdChanged);
   sess.subscribe("orasales:unit-threshold", onUnitThresholdChanged);
};


function updateStatusline(status) {
   $(".statusline").text(status);
};




function DashboardViewModel () {

   var self = this;

   self.simpleIndicatorHighlighted = ko.observable();
   self.barChartHighlighted = ko.observable();
   self.hundredBarHighlighted = ko.observable();
   self.activityStreamHighlighted = ko.observable();
   self.bulletGraphHighlighted = ko.observable();
   self.pieChartHighlighted = ko.observable();

   // dashboard display
   this.dashboard_01_display = ko.observable("block");
   this.dashboard_02_display = ko.observable("none");
   this.dashboard_03_display = ko.observable("none");

   /*****************************
    *     simple indicator
    *****************************/
   self.simpleIndicatorBigNumber = ko.observable(45);
   self.simpleIndicatorComparisonValue = ko.observable(34);
   self.simpleIndicatorTrend = ko.computed(function() {
      //ab.log("simpleIndicatorTrend", parseInt((self.simpleIndicatorBigNumber() / self.simpleIndicatorComparisonValue() - 1) * 100));
      //ab.log("the parts", self.simpleIndicatorBigNumber(), self.simpleIndicatorComparisonValue());
      return (parseInt(( self.simpleIndicatorBigNumber() / self.simpleIndicatorComparisonValue() - 1 ) * 100));
   },self);
   self.simpleIndicatorTrendDisplay = ko.computed(function() {
      var displayValue;
      self.simpleIndicatorTrend() > 0 ? displayValue = "+" + self.simpleIndicatorTrend() : displayValue = self.simpleIndicatorTrend();
      return displayValue;
   },self);

   self.simpleIndicatorBigNumberDisplay = ko.computed(function() {
      return thousand_formatted(parseInt(self.simpleIndicatorBigNumber()));
   }, self);


   /*****************************
    *      bar chart
    *****************************/

   this.bar_01_value = ko.observable("30"),
   this.bar_02_value = ko.observable("634"),
   this.bar_03_value = ko.observable("34");

   this.bar_scale_max_value = ko.computed(function () {
      var bar_values = [this.bar_01_value(), this.bar_02_value(), this.bar_03_value()];
      var bar_max_value = 0;
      for (var i = 0; i < bar_values.length; i++) {
         if ( parseInt(bar_values[i]) > bar_max_value) {
            bar_max_value = parseInt(bar_values[i]);
         }
      }
      return bar_max_value;
      }, this);

   this.bar_chart_total_height = ko.observable(105);

   this.bar_01_height = ko.computed(function() {
      return bar_chart_height(this.bar_01_value(), this.bar_scale_max_value(), this.bar_chart_total_height());
   }, this);
   this.bar_02_height = ko.computed(function() {
      return bar_chart_height(this.bar_02_value(), this.bar_scale_max_value(), this.bar_chart_total_height());
   }, this);
   this.bar_03_height = ko.computed(function() {
      return bar_chart_height(this.bar_03_value(), this.bar_scale_max_value(), this.bar_chart_total_height());
   }, this);


   /*****************************
    *      hundred bar
    *****************************/

   // target width in px
   self.hundred_bar_width = 335;

   // hundred bar sections to be iterated over
   // arguments: value (is scaled), color, label for legend
   this.hundred_bar_sections = ko.observableArray([
      new hundred_bar_section(100, hundredColor01, "One"),
      new hundred_bar_section(200, hundredColor02, "Two"),
      new hundred_bar_section(100, hundredColor03, "Three"),
   ]);

   // fires when stacked bar array has changed: compute total
   // and rescale individual bars
   this.hundred_bar_total = ko.computed(function() {
      var cnt = self.hundred_bar_sections().length;
      var total = 0;
      for (var i = 0; i < cnt; ++i) {
         total += self.hundred_bar_sections()[i].hundred_width();
      }
      for (var i = 0; i < cnt; ++i) {
         var e = self.hundred_bar_sections()[i];
         e.width(Math.floor((self.hundred_bar_width - 5) * e.hundred_width() / total));
         // Math.floor since otherwise rounding errors in Firefox could mean that
         // the total allowed bar length was exceeded by a small fraction of a pixel
         
         // (self.hundred_bar_width - 5) is an attempt at giving a little play,
         // since the sequential adjustment of the sub-bar-widths means that
         // during the update cycle the total length can exceed that allowed may lenght,
         // and this results in a line break within the bar, which disappears once the
         // update cycle has finished - FIXME
      }
      return total;
   });

   this.activity_stream_events = ko.observableArray([]);

   /*****************************
    *      bullet graph
    *****************************/

      // section widths (in percent) - sections for all four graphs the same
   this.bulletSection01 = ko.observable("20%");
   this.bulletSection02 = ko.observable("30%");
   this.bulletSection03 = ko.observable("40%");
   this.bulletSection04 = ko.observable("10%");

      // target position
   this.bulletTarget01 = ko.observable(45);
   this.bulletTarget02 = ko.observable(68);
   this.bulletTarget03 = ko.observable(10);
   this.bulletTarget04 = ko.observable(80);

      // bar values
   this.bulletBarPixelWidth = 200;
   this.bulletBarMaxValue = 100;
   this.bulletBar01 = ko.observable(80);
   this.bulletBar02 = ko.observable(50);
   this.bulletBar03 = ko.observable(80);
   this.bulletBar04 = ko.observable(80);

      // actual bar lengths
   this.bulletBar01_length = ko.computed(function() {
      return bar_chart_height(this.bulletBar01(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletBar02_length = ko.computed(function() {
      return bar_chart_height(this.bulletBar02(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletBar03_length = ko.computed(function() {
      return bar_chart_height(this.bulletBar03(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletBar04_length = ko.computed(function() {
      return bar_chart_height(this.bulletBar04(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);

   // actual target positions
   this.bulletTarget01_position = ko.computed(function() {
      return bar_chart_height(this.bulletTarget01(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletTarget02_position = ko.computed(function() {
      return bar_chart_height(this.bulletTarget02(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletTarget03_position = ko.computed(function() {
      return bar_chart_height(this.bulletTarget03(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);
   this.bulletTarget04_position = ko.computed(function() {
      return bar_chart_height(this.bulletTarget04(), this.bulletBarMaxValue, this.bulletBarPixelWidth);
   }, this);




   /*****************************
    *      pie chart
    *****************************/

   this.pieSection01 = ko.observable(30);
   this.pieSection02 = ko.observable(40);
   this.pieSection03 = ko.observable(50);
   this.pieSection04 = ko.observable(50);
}

// binding variables for the activity stream template
function activity_stream_event (product, units, region, revenue, icon) {
   //this.actvitiy_text = text;
   this.product = product;
   this.units = units;
   this.region = region;
   this.revenue = revenue;
   this.activity_timestamp = format_date(new Date());
   //this.activity_icon = "img/" + icon;
   this.iconmap = {
      "call":"img/cell.png",
      "sale":"img/dollar.png",
      "emergency":"img/fire.png",
      "agreement":"img/handshake.png",
      "news":"img/wireless.png"
   }
   this.activity_icon = this.iconmap[icon];
   ab.log(this.activity_icon);
}



// binding variables for the hundred bar section template
function hundred_bar_section (width, color, label) {
   this.hundred_width = ko.observable(width);
   this.width = ko.observable();
   this.section_color = color;
   this.legend_label = label;
}

function highlightTimer ( timer )
{

   if (!timer.highlighted) {
      $(timer.targetClass).addClass("highlighted");
      timer.highlighted = true;
   }
   else {
      clearTimeout(timer.timer)
   }

   timer.timer = setTimeout(function () {
      $(timer.targetClass).removeClass("highlighted");
      timer.highlighted = false;
      clearTimeout(timer.timer);
   }, timer.timeout);

}


// makes the values within the DashboardViewModel accessible from outside the model
var vm = new DashboardViewModel();

$(document).ready(function()
{
   updateStatusline("Not connected.");

   // set up knockout.js view model
   ko.applyBindings(vm);

   connect();

   // set up the sliders for the activity stream
   $("#revenue_threshold").slider({
      value: 0,
      orientation: "horizontal",
      range: "min",
      animate: true
   });

   $("#unit_threshold").slider({
      value: 0,
      orientation: "horizontal",
      range: "min",
      animate: true
   });

   $("#revenue_threshold").slider({
      slide: function(event, ui) {
         revenue_threshold = parseInt(ui.value * 100);
         $(".revenue_threshold_value").text(thousand_formatted(revenue_threshold));
         sess.publish("sales:revenue-threshold-changed", revenue_threshold);
      }
   });

   $("#unit_threshold").slider({
      slide: function(event, ui) {
         unit_threshold = parseInt(ui.value / 10);
         $(".unit_threshold_value").text(unit_threshold);
         sess.publish("sales:unit-threshold-changed", unit_threshold);
      }
   });

   $("#revenue_threshold_02").slider({
      value: 0,
      orientation: "horizontal",
      range: "min",
      animate: true
   });

   $("#unit_threshold_02").slider({
      value: 0,
      orientation: "horizontal",
      range: "min",
      animate: true
   });

   $("#revenue_threshold_02").slider({
      slide: function(event, ui) {
         revenue_threshold = parseInt(ui.value * 100);
         $(".revenue_threshold_value").text(thousand_formatted(revenue_threshold));
         sess.publish("sales:revenue-threshold-changed", revenue_threshold);
      }
   });

   $("#unit_threshold_02").slider({
      slide: function(event, ui) {
         unit_threshold = parseInt(ui.value / 10);
         $(".unit_threshold_value").text(unit_threshold);
         sess.publish("sales:unit-threshold-changed", unit_threshold);
      }
   });

   // generate SVG canvases for pie charts and draw charts with initial settings
   document.getElementById("pie_chart_content_container").appendChild(SVG.makeCanvas("pieChart1", 350, 300, 350, 300));
   document.getElementById("pie_chart_content_container_02").appendChild(SVG.makeCanvas("pieChart2", 350, 300, 350, 300));
   drawPieChart();

   // fill activity list with test data
   vm.activity_stream_events.unshift(
      new activity_stream_event("Produkt A", 14, "West", 24000),
      new activity_stream_event("Produkt B", 2, "West", 2000)
      );

   $("#helpButton").click(function() { $(".info_bar").toggle() });

});

function drawPieChart () {
   // arguments:
      // id of svg element, [ values for section size, get normalized ], center_x, center_y, radius, [ colors ], [ legend labels ], legend_x, legend_y
   pieChart("pieChart1", [parseInt(vm.pieSection01()), parseInt(vm.pieSection02()), parseInt(vm.pieSection03()), parseInt(vm.pieSection04())], 125, 170, 125, [chartColor01, chartColor02, chartColor03, chartColor04], ["North", "East", "South", "West"], 265, 0);
   pieChart("pieChart2", [parseInt(vm.pieSection01()), parseInt(vm.pieSection02()), parseInt(vm.pieSection03()), parseInt(vm.pieSection04())], 125, 170, 125, [chartColor01, chartColor02, chartColor03, chartColor04], ["North", "East", "South", "West"], 265, 0);
}

// subscription event handling

function onDashboardSwitch ( topicuri, event ) {
  ab.log( event);
   var dashboards = [ vm.dashboard_01_display, vm.dashboard_02_display, vm.dashboard_03_display];
   for ( var i = 0; i < dashboards.length; i++) {
      if ( i === event ) {
         dashboards[i]("block");
      }
      else {
         dashboards[i]("none");
      }
   }
}




/*********************************
 *    DEMO EVENTS       *
 *********************************/

function onRevenue (topicURI, event) {
   //ab.log(topicURI, event);
   if (event["idx"]) {
      switch (event["idx"]) {
         case 1:
            vm.simpleIndicatorBigNumber(event["val"]);
            break;
         case 2:
            vm.simpleIndicatorComparisonValue(event["val"]);
            break;
         default:
            ab.log("uncovered value", topicURI, event);
            break;
      }
   }
   else {
      vm.simpleIndicatorBigNumber(event[0][0]);
      vm.simpleIndicatorComparisonValue(event[0][1]);
   }
   highlightTimer(simple_timer);
}
function onRevenueByProduct (topicURI, event) {
   //ab.log(topicURI, event);
   if (event["idx"]) {
      switch (event["idx"]) {
         case 1:
            vm.bar_01_value(event["val"]);
            break;
         case 2:
            vm.bar_02_value(event["val"]);
            break;
         case 3:
            vm.bar_03_value(event["val"]);
            break;
         default:
            ab.log("uncovered value", topicURI, event);
            break;
      }
   }
   else {
      vm.bar_01_value(event["Product A"][0]);
      vm.bar_02_value(event["Product B"][0]);
      vm.bar_03_value(event["Product C"][0]);
   }
   highlightTimer( bars_timer );
}
function onUnitsByProduct (topicURI, event) {
   //ab.log(topicURI, event);
   if (event["idx"]) {
      switch (event["idx"]) {
         case 1:
            vm.hundred_bar_sections()[0].hundred_width(event["val"]);
            break;
         case 2:
            vm.hundred_bar_sections()[1].hundred_width(event["val"]);
            break;
         case 3:
            vm.hundred_bar_sections()[2].hundred_width(event["val"]);
            break;
         default:
            ab.log("uncovered value", topicURI, event);
            break;
      }
   }
   else {
      vm.hundred_bar_sections()[0].hundred_width(event["Product A"][0]);
      vm.hundred_bar_sections()[1].hundred_width(event["Product B"][0]);
      vm.hundred_bar_sections()[2].hundred_width(event["Product C"][0]);
   }
   highlightTimer ( hundred_timer );
}
function onRevenueByRegion (topicURI, event) {
   //ab.log(topicURI, event);
   if (event["idx"]) {
      switch (event["idx"]) {
         case 1:
            vm.pieSection01(event["val"]);
            break;
         case 2:
            vm.pieSection02(event["val"]);
            break;
         case 3:
            vm.pieSection03(event["val"]);
            break;
         case 4:
            vm.pieSection04(event["val"]);
            break;
         default:
            ab.log("uncovered value", topicURI, event);
            break;
      }
   }
   else {
      vm.pieSection01(event["North"][0]);
      vm.pieSection02(event["East"][0]);
      vm.pieSection03(event["South"][0]);
      vm.pieSection04(event["West"][0]);
   }
   drawPieChart();
   highlightTimer ( pie_timer );
}
function onAspByRegion (topicURI, event) {
   //ab.log(topicURI, event);
   if (event["idx"]) {
      switch (event["idx"]) {
         case 1:
            vm.bulletBar01(event["val"]);
            break;
         case 2:
            vm.bulletBar02(event["val"]);
            break;
         case 3:
            vm.bulletBar03(event["val"]);
            break;
         case 4:
            vm.bulletBar04(event["val"]);
            break;
         default:
            ab.log("uncovered value", topicURI, event);
            break;
      }
   }
   else {
      vm.bulletBar01(event["North"][0] * .2);
      vm.bulletBar02(event["East"][0] * .2);
      vm.bulletBar03(event["South"][0] * .2);
      vm.bulletBar04(event["West"][0] * .2);

      vm.bulletTarget01(event["North"][1] * .2);
      vm.bulletTarget02(event["East"][1] * .2);
      vm.bulletTarget03(event["South"][1] * .2);
      vm.bulletTarget04(event["West"][1] * .2);
   }


   //vm.bulletTarget01(event["North"][1]);
   //vm.bulletTarget02(event["East"][1]);
   //vm.bulletTarget03(event["South"][1]);
   //vm.bulletTarget04(event["West"][1]);

   highlightTimer ( bullet_timer );

}

var onSaleTest = { "revenue": 2000, "units": 3, "product": "Hummer", "region": "moon"};

function onSale(topicURI, event) {
   //ab.log(topicURI, event);

   if (event["revenue"] > revenue_threshold || event["units"] > unit_threshold) {

      var icon = "sale";

      vm.activity_stream_events.unshift(new activity_stream_event(event["product"], event["units"], event["region"], event["revenue"]));
      sess.publish("sales:activity-display-threshold-exceeded", event);
      highlightTimer ( activity_timer );
   };

};

function onRevenueThresholdChanged ( topicURI, event) {
   $("#revenue_threshold").slider({
      value: event
   });
};

function onUnitThresholdChanged ( topicURI, event ) {
   $("#unit_threshold").slider({
      value: event
   });
};



/******* SVG PIE CHART CODE ******/
/* from http://jmvidal.cse.sc.edu/talks/canvassvg/javascriptandsvg.xml ***/

// Create a namespace for our SVG-related utilities
var SVG = {};

// These are SVG-related namespace URLs
SVG.ns = "http://www.w3.org/2000/svg";
SVG.xlinkns = "http://www.w3.org/1999/xlink";

// Create and return an empty <svg> element.
// Note that the element is not added to the document
// Note that we can specify the pixel size of the image as well as
// its internal coordinate system.
SVG.makeCanvas = function(id, pixelWidth, pixelHeight, userWidth, userHeight) {
    var svg = document.createElementNS(SVG.ns, "svg:svg");
    svg.setAttribute("id", id);
    // How big is the canvas in pixels
    svg.setAttribute("width", pixelWidth);
    svg.setAttribute("height", pixelHeight);
    // Set the coordinates used by drawings in the canvas
    svg.setAttribute("viewBox", "0 0 " + userWidth + " " + userHeight);
    // Define the XLink namespace that SVG uses
    svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink",
                       SVG.xlinkns);
    return svg;
};


/**
 * Draw a pie chart into an <svg> element.
 * Arguments:
 *   canvas: the SVG element (or the id of that element) to draw into.
 *   data: an array of numbers to chart, one for each wedge of the pie.
 *   cx, cy, r: the center and radius of the pie
 *   colors: an array of HTML color strings, one for each wedge
 *   labels: an array of labels to appear in the legend, one for each wedge
 *   lx, ly: the upper-left corner of the chart legend
 */
function pieChart(canvas, data, cx, cy, r, colors, labels, lx, ly) {
    //ab.log(arguments);
    // Locate canvas if specified by id instead of element
    if (typeof canvas == "string") canvas = document.getElementById(canvas);

    // Add up the data values so we know how big the pie is
    var total = 0;
    for(var i = 0; i < data.length; i++) total += data[i];

    // Now figure out how big each slice of pie is.  Angles in radians.
    var angles = []
    for(var i = 0; i < data.length; i++) angles[i] = data[i]/total*Math.PI*2;

    // Loop through each slice of pie.
    startangle = 0;
    for(var i = 0; i < data.length; i++) {
        // This is where the wedge ends
        var endangle = startangle + angles[i];

        // Compute the two points where our wedge intersects the circle
        // These formulas are chosen so that an angle of 0 is at 12 o'clock
        // and positive angles increase clockwise.
        var x1 = cx + r * Math.sin(startangle);
        var y1 = cy - r * Math.cos(startangle);
        var x2 = cx + r * Math.sin(endangle);
        var y2 = cy - r * Math.cos(endangle);

        // This is a flag for angles larger than than a half circle
        var big = 0;
        if (endangle - startangle > Math.PI) big = 1;

        // We describe a wedge with an <svg:path> element
        // Notice that we create this with createElementNS()
        var path = document.createElementNS(SVG.ns, "path");

        // This string holds the path details
        var d = "M " + cx + "," + cy +  // Start at circle center
            " L " + x1 + "," + y1 +     // Draw line to (x1,y1)
            " A " + r + "," + r +       // Draw an arc of radius r
            " 0 " + big + " 1 " +       // Arc details...
            x2 + "," + y2 +             // Arc goes to to (x2,y2)
            " Z";                       // Close path back to (cx,cy)
        // This is an XML element, so all attributes must be set
        // with setAttribute().  We can't just use JavaScript properties
        path.setAttribute("d", d);              // Set this path
        path.setAttribute("fill", colors[i]);   // Set wedge color
        //path.setAttribute("class", colors[i]);
        //path.setAttribute("stroke", "black");   // Outline wedge in black
        //path.setAttribute("stroke-width", "2"); // 2 units thick
        canvas.appendChild(path);               // Add wedge to canvas

        // The next wedge begins where this one ends
        startangle = endangle;

        // Now draw a little matching square for the key
        var icon = document.createElementNS(SVG.ns, "rect");
        icon.setAttribute("x", lx);             // Position the square
        icon.setAttribute("y", ly + 30*i);
        icon.setAttribute("width", 20);         // Size the square
        icon.setAttribute("height", 20);
        icon.setAttribute("fill", colors[i]);   // Same fill color as wedge
        //icon.setAttribute("class", colors[i]);   // Same fill color as wedge
        //icon.setAttribute("stroke", "black");   // Same outline, too.
        //icon.setAttribute("stroke-width", "2");
        canvas.appendChild(icon);               // Add to the canvas

        // And add a label to the right of the rectangle
        var label = document.createElementNS(SVG.ns, "text");
        label.setAttribute("x", lx + 30);       // Position the text
        label.setAttribute("y", ly + 30*i + 18);
        // Text style attributes could also be set via CSS
        label.setAttribute("font-family", "sans-serif");
        label.setAttribute("font-size", "12");
        //label.setAttribute("stroke", "#bbbbbb");
        label.setAttribute("fill", "#bbbbbb");
        // Add a DOM text node to the <svg:text> element
        label.appendChild(document.createTextNode(labels[i]));
        canvas.appendChild(label);              // Add text to the canvas
    }
}


// helper functions

// takes a javascript date object and returns a formatted string
function format_date (myDate) {
   return (((myDate.getMonth()+1) < 10 ? '0' : '') + myDate.getMonth()) + "/" + ((myDate.getDate() < 10 ? '0' : '') + myDate.getDate()) + "/" + myDate.getFullYear() + "  " + ((myDate.getHours() < 10 ? '0' : '') + myDate.getHours()) + ":" + ((myDate.getMinutes() <10 ? '0' : '') + myDate.getMinutes())/* + "  " + "GMT " + (( myDate.getTimezoneOffset()/60*-1 < 0 ) ? "-" : "+") + myDate.getTimezoneOffset()/60*-1*/;
};

// takes a current value, the maximum possible value and a display element dimension, returns a scaled current value to fit with the display element
function bar_chart_height(value, maxvalue, totalHeight) {
   return value/maxvalue*totalHeight;
}

// takes a number (can be passed as a string or integer), returns this as a string with a dot to mark three decimal places)
function thousand_formatted(number) {
   var full = number.toString();
   var formatted = "";
   while ( full.length > 3) {
      var thousand = full.slice((full.length - 3), full.length);
      var formatted = "." + thousand + formatted;
      var full = full.slice(0, (full.length - 3));
   }
   var formatted = full + formatted;
   return formatted;
}


/*** scaling with CSS
 *
 * regular starting point is the top left corner of the element (moz), opera claims middle (test this)
 * is set with transform-origin: top/left..., % or px
 *
 * then use transform: scale (x,y)
 *
 * so:
 * - render the page
 * - get the width of the viewport
 * - get the width of the table
 * - scale factor = viewportwidth/tablewidth
 * - scale by this
 *
 *
 *
 *
 */
