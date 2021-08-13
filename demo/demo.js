/*  demo.js http://github.com/bgrins/javascript-astar
    MIT License

    Set up the demo page for the A* Search
*/
/* global Graph, astar, $ */

let globalNodes;

var WALL = 0,
    performance = window.performance;

$(function() {

    var $grid = $("#search_grid"),
        $selectWallFrequency = $("#selectWallFrequency"),
        $selectGridSize = $("#selectGridSize"),
        $checkDebug = $("#checkDebug"),
        $searchDiagonal = $("#searchDiagonal"),
        $checkClosest = $("#checkClosest");

    var opts = {
        wallFrequency: $selectWallFrequency.val(),
        gridSize: $selectGridSize.val(),
        debug: $checkDebug.is("checked"),
        diagonal: $searchDiagonal.is("checked"),
        closest: $checkClosest.is("checked")
    };

    var grid = new GraphSearch($grid, opts, astar.search);

    $("#btnGenerate").click(function() {
        grid.initialize();
    });

    $selectWallFrequency.change(function() {
        grid.setOption({wallFrequency: $(this).val()});
        grid.initialize();
    });

    $selectGridSize.change(function() {
        grid.setOption({gridSize: $(this).val()});
        grid.initialize();
    });

    $checkDebug.change(function() {
        grid.setOption({debug: $(this).is(":checked")});
    });

    $searchDiagonal.change(function() {
        var val = $(this).is(":checked");
        grid.setOption({diagonal: val});
        grid.graph.diagonal = val;
    });

    $checkClosest.change(function() {
        grid.setOption({closest: $(this).is(":checked")});
    });

    $("#generateWeights").click( function () {
        if ($("#generateWeights").prop("checked")) {
            $('#weightsKey').slideDown();
        } else {
            $('#weightsKey').slideUp();
        }
    });

});

var css = { start: "start", finish: "finish", wall: "wall", active: "active", best: "best" };
function GraphSearch($graph, options, implementation) {
    this.$graph = $graph;
    this.search = astar.search;
    this.opts = $.extend({wallFrequency:0.1, debug:true, gridSize:10}, options);
    this.initialize();
}
GraphSearch.prototype.setOption = function(opt) {
    this.opts = $.extend(this.opts, opt);
    this.drawDebugInfo();
};
GraphSearch.prototype.initialize = function() {
    this.grid = [];
    var self = this,
        nodes = [],
        $graph = this.$graph;

    $graph.empty();

    var cellWidth = ($graph.width()/this.opts.gridSize)-2,  // -2 for border
        cellHeight = ($graph.height()/this.opts.gridSize)-2,
        $cellTemplate = $("<span />").addClass("grid_item").width(cellWidth).height(cellHeight),
        startSet = false;

    for(var x = 0; x < this.opts.gridSize; x++) {
        var $row = $("<div class='clear' />"),
            nodeRow = [],
            gridRow = [];

        for(var y = 0; y < this.opts.gridSize; y++) {
            var id = "cell_"+x+"_"+y,
                $cell = $cellTemplate.clone();
            $cell.attr("id", id).attr("x", x).attr("y", y);
            $row.append($cell);
            gridRow.push($cell);

            var isWall = Math.floor(Math.random()*(1/self.opts.wallFrequency));
            if(isWall === 0) {
                nodeRow.push(WALL);
                $cell.addClass(css.wall);
            }
            else  {
                var cell_weight = ($("#generateWeights").prop("checked") ? (Math.floor(Math.random() * 3)) * 2 + 1 : 1);
                nodeRow.push(cell_weight);
                $cell.addClass('weight' + cell_weight);
                if ($("#displayWeights").prop("checked")) {
                    $cell.html(cell_weight);
                }
                if (!startSet) {
                    $cell.addClass(css.start);
                    startSet = true;
                }
            }
        }
        $graph.append($row);

        this.grid.push(gridRow);
        nodes.push(nodeRow);
    }

    globalNodes = nodes;

    this.graph = new Graph(nodes);

    // bind cell event, set start/wall positions
    this.$cells = $graph.find(".grid_item");
    this.$cells.click(function() {
        self.cellClicked($(this));
    });
};
async function main(data) {

    function workerFunction(input) {
        progress();
        let astar = require('astar-dcp-package.js');
        progress();
        let parsedInput = JSON.parse(input);
        progress();
        return astar.solve(parsedInput);
    }

    let numSlices = +document.getElementById('numPaths').value;
    console.log('numpaths:', numSlices, typeof(numSlices));
    let inputData = new Array(numSlices).fill(data);
    console.log('input data:', inputData)

    const job = window.dcp.compute.for(
        inputData,
        workerFunction,
    );

    job.on('console', (ev) => {
    console.log(ev)
    })

    job.on('accepted', () => {
    console.log(` - Job accepted by scheduler, waiting for results`);
    console.log(` - Job has id ${job.id}`);
    startTime = Date.now();
    });

    job.on('readystatechange', (arg) => {
    console.log(`new ready state: ${arg}`);
    });

    job.on('result', (ev) => {
    console.log(ev)
    });
    
    job.on('error', (ev)=>{console.log('error',ev)})

    job.requires(['sam_astar/astar-dcp-package.js']);

    job.public.name = 'Puzzle';
    
    const results = await job.localExec();
    console.log('results=', Array.from(results));
    return Array.from(results);
    
}
GraphSearch.prototype.cellClicked = async function($end) {

    var end = this.nodeFromElement($end);

    if($end.hasClass(css.wall) || $end.hasClass(css.start)) {
        return;
    }

    this.$cells.removeClass(css.finish);
    $end.addClass("finish");
    var $start = this.$cells.filter("." + css.start),
        start = this.nodeFromElement($start);

    var sTime = performance ? performance.now() : new Date().getTime();

    let numPaths = document.getElementById('numPaths').value;
    let paths = [];

    let randomHeuristicScale = document.getElementById("randomHeuristicScale").value;
    if (randomHeuristicScale == 123456789) {
        randomHeuristicScale = NaN;
    }
    console.log('scale:', randomHeuristicScale);

    function GridNode(x, y, weight) {
        this.x = x;
        this.y = y;
        this.weight = weight;
    }

    GridNode.prototype.toString = function() {
        return "[" + this.x + " " + this.y + "]";
    };
    
    GridNode.prototype.getCost = function(fromNeighbor) {
        // Take diagonal weight into consideration.
        if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
            return this.weight * 1.41421;
        }
        return this.weight;
    };
    
    GridNode.prototype.isWall = function() {
        return this.weight === 0;
    };

    if ($("#enableDCP").prop("checked")) {
        let p = await main({nodes: globalNodes, start: start, end: end, options: {closest: true, randomHeuristicScale: randomHeuristicScale}} );
        for (let slice of p) {
            for (let pnode in slice) {
                slice[pnode] = new GridNode(slice[pnode].x, slice[pnode].y, slice[pnode].weight)
            }
            paths.push(slice);
        }
    } else {
        console.log('running without dcp...', this.graph, start, end)
        for (let i = 0; i < numPaths; i++) {
            path = this.search(this.graph, start, end, {
                closest: this.opts.closest,
                randomHeuristicScale: randomHeuristicScale,
            });
            paths.push(path);
        }
    }

    var fTime = performance ? performance.now() : new Date().getTime(),
        duration = (fTime-sTime).toFixed(2);

    if(paths[0].length === 0) {
        $("#message").text("couldn't find a path (" + duration + "ms)");
        this.animateNoPath();
    }
    else {
        $("#message").text("search took " + duration + "ms.");
        this.drawDebugInfo();
        let pathLengths = [];
        for (let i in paths) {
            pathLengths.push(paths[i].length);
        }
        console.log('path lengths:', pathLengths, Math.min(...pathLengths))
        let bestPathIndex = pathLengths.indexOf(Math.min(...pathLengths));
        console.log('best path is:', bestPathIndex)
        for (let i in paths) {
            console.log(i, bestPathIndex, i == bestPathIndex)
            this.animatePath(paths[i], i == bestPathIndex ? true : false)
        }
    }
};
GraphSearch.prototype.drawDebugInfo = function() {
    this.$cells.html(" ");
    var that = this;
    if(this.opts.debug) {
        that.$cells.each(function() {
            var node = that.nodeFromElement($(this)),
                debug = false;
            if (node.visited) {
                debug = "F: " + node.f + "<br />G: " + node.g + "<br />H: " + node.h;
            }

            if (debug) {
                $(this).html(debug);
            }
        });
    }
};
GraphSearch.prototype.nodeFromElement = function($cell) {
    return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};
GraphSearch.prototype.animateNoPath = function() {
    var $graph = this.$graph;
    var jiggle = function(lim, i) {
        if(i>=lim) { $graph.css("top", 0).css("left", 0); return; }
        if(!i) i=0;
        i++;
        $graph.css("top", Math.random()*6).css("left", Math.random()*6);
        setTimeout(function() {
            jiggle(lim, i);
        }, 5);
    };
    jiggle(15);
};
GraphSearch.prototype.animatePath = function(path, isBest) {
    var grid = this.grid,
        timeout = 1000 / grid.length,
        elementFromNode = function(node) {
        return grid[node.x][node.y];
    };

    let randomColorShift = Math.random();

    var self = this;
    // will add start class if final
    var removeClass = function(path, i) {
        if(i >= path.length) { // finished removing path, set start positions
            return setStartClass(path, i);
        }
        elementFromNode(path[i]).removeClass(css.active);
        elementFromNode(path[i]).attr('filter', 'brightness:(1)')
        setTimeout(function() {
            removeClass(path, i+1);
        }, timeout*path[i].getCost());
    };
    var setStartClass = function(path, i) {
        if(i === path.length) {
            self.$graph.find("." + css.start).removeClass(css.start);
            elementFromNode(path[i-1]).addClass(css.start);
        }
    };
    var addClass = function(path, i) {
        if(i >= path.length) { // Finished showing path, now remove
            return removeClass(path, 0);
        }

        if (isBest) {
            elementFromNode(path[i]).addClass(css.best);
        }
        else {
            elementFromNode(path[i]).addClass(css.active);
            elementFromNode(path[i]).attr('filter', `brightness:(${randomColorShift})`);
        }

        
        setTimeout(function() {
            addClass(path, i+1);
        }, timeout*path[i].getCost());
    };

    addClass(path, 0);
    this.$graph.find("." + css.start).removeClass(css.start);
    this.$graph.find("." + css.finish).removeClass(css.finish).addClass(css.start);
};
