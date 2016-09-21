var rectSide = {
    none: 0,
    top: 1,
    bottom: 2,
    right: 3,
    left: 4,
    center: 5,
    topRight: 6,
    topLeft: 7,
    bottomRight: 8,
    bottomLeft: 9
};

var cusorsType = {
    none: "initial",
    top: "n-resize",
    bottom: "s-resize",
    right: "e-resize",
    left: "w-resize",
    center: "move",
    topRight: "ne-resize",
    topLeft: "nw-resize",
    bottomRight: "se-resize",
    bottomLeft: "sw-resize"
};

var imageObj = new Image();
var rectangles = [];
var selectedRect = {r: -1, t: "none"};
var lineWidth = 1;
var selectedRectPos = {x: 0, y: 0};
var mouseClickPos = {x: 0, y: 0};

var canvas;
var contnerDiv;
var context;
var divToImageRatio;
var divToCanvasRatio;

var abs = Math.abs;
var max = Math.max;
var round = Math.round;

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * divToCanvasRatio.w,
        y: (evt.clientY - rect.top) * divToCanvasRatio.h
    }
}

function isACorner(side) {
    return (side == "topRight" || side == "topLeft" || side == "bottomRight" || side == "bottomLeft");
}

function getRectangle(p1, p2) {
    var p;
    if (p1.x < p2.x) {
        if (p1.y < p2.y) {
            p = p1;
        } else {
            p = {x: p1.x, y: p2.y};
        }
    } else {
        if (p1.y < p2.y) {
            p = {x: p2.x, y: p1.y};
        } else {
            p = p2;
        }
    }

    return {
        x: p.x,
        y: p.y,
        w: abs(p1.x - p2.x),
        h: abs(p1.y - p2.y)
    }
}

function saveClickPoint(mousePos) {
    switch(selectedRect.t) {
        case "none":
            selectedRectPos = mousePos;
            selectedRect.r = rectangles.length;
            rectangles.push(getRectangle(selectedRectPos, selectedRectPos));
            break;
        case "top":
        case "topRight":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x,
                y: rectangles[selectedRect.r].y + rectangles[selectedRect.r].h
            };
            break;
        case "topLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y + rectangles[selectedRect.r].h
            };
            break;
        case "bottom":
        case "right":
        case "bottomRight":
        case "center":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x,
                y: rectangles[selectedRect.r].y
            };
            break;
            break;
        case "left":
        case "bottomLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y
            };
            break;
        default:
            selectedRectPos = mousePos;

    }
}

function editRectangle(mousePos) {
    switch(selectedRect.t) {
        case "top":
        case "bottom":
            rectangles[selectedRect.r] = getRectangle(selectedRectPos,
                {x: rectangles[selectedRect.r].x + rectangles[selectedRect.r].w, y: mousePos.y});
            break;
        case "right":
        case "left":
            rectangles[selectedRect.r] = getRectangle(selectedRectPos,
                {x: mousePos.x, y: rectangles[selectedRect.r].y + rectangles[selectedRect.r].h});
            break;
        case "center":
            rectangles[selectedRect.r].x = mousePos.x - mouseClickPos.x + selectedRectPos.x;
            rectangles[selectedRect.r].y = mousePos.y - mouseClickPos.y + selectedRectPos.y;
            break;
        default:
            rectangles[selectedRect.r] = getRectangle(selectedRectPos, mousePos);
    }
}

function setSelectedRectangle(mousePos) {
    var tolerance = lineWidth * 15;
    var bestSelection = {r: -1, t: "none", v: Infinity};

    for (i = 0; i < rectangles.length; i++) {
        var rect = rectangles[i];
        var selectionArea = {
            top: abs(rect.y - mousePos.y),
            bottom: abs(rect.y + rect.h - mousePos.y),
            right: abs(rect.x + rect.w - mousePos.x),
            left: abs(rect.x - mousePos.x),
            center: abs(rect.x + rect.w/2 - mousePos.x) + abs(rect.y + rect.h/2 - mousePos.y)
        };

        if (mousePos.x < rect.x - tolerance || mousePos.x > rect.x + rect.w + tolerance) {
            selectionArea.top = Infinity;
            selectionArea.bottom = Infinity;
            selectionArea.center = Infinity;
        } else {
            if (selectionArea.top > tolerance) {
                selectionArea.top = Infinity;
            }
            if (selectionArea.bottom > tolerance) {
                selectionArea.bottom = Infinity;
            }
        }

        if (mousePos.y < rect.y - tolerance || mousePos.y > rect.y + rect.h + tolerance) {
            selectionArea.right = Infinity;
            selectionArea.left = Infinity;
            selectionArea.center = Infinity;
        } else {
            if (selectionArea.right > tolerance) {
                selectionArea.right = Infinity;
            }
            if (selectionArea.left > tolerance) {
                selectionArea.left = Infinity;
            }
        }

        selectionArea.topRight = selectionArea.top + selectionArea.right;
        selectionArea.topLeft = selectionArea.top + selectionArea.left;
        selectionArea.bottomRight = selectionArea.bottom + selectionArea.right;
        selectionArea.bottomLeft = selectionArea.bottom + selectionArea.left;

        for(var side in selectionArea) {
            var isAreaACorner = isACorner(side);
            var isBestAreaACorner = isACorner(bestSelection.t);
            if ((selectionArea[side] < Infinity && isAreaACorner && !isBestAreaACorner) ||
                ((!isAreaACorner || isBestAreaACorner) && selectionArea[side] < bestSelection.v)) {
                bestSelection = {r: i, t: side, v: selectionArea[side]};
            }
        }
    }

    selectedRect = {r: bestSelection.r, t: bestSelection.t};
    canvas.style.cursor = cusorsType[selectedRect.t];
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.drawImage(imageObj,
        canvas.width/2-imageObj.width/2,
        canvas.height/2-imageObj.height/2,
        imageObj.width, imageObj.height);

    for (i = 0; i < rectangles.length; i++) {
        if(i == selectedRect.r) {
            context.strokeStyle="blue";
            context.lineWidth = lineWidth*2;
        } else {
            context.strokeStyle="black";
            context.lineWidth = lineWidth;
        }

        var rect = rectangles[i];
        context.beginPath();
        context.rect(rect.x, rect.y, rect.w, rect.h);
        context.stroke();
    }
}

function startListeners() {
    var drawingRect = false;

    canvas.addEventListener('mousedown', function(evt) {
        drawingRect = true;
        mouseClickPos = getMousePos(canvas, evt);
        saveClickPoint(mouseClickPos);
    }, false);

    canvas.addEventListener('mousemove', function(evt) {
        var mousePos = getMousePos(canvas, evt);
        if (drawingRect) {
            editRectangle(mousePos);
        } else {
            setSelectedRectangle(mousePos);
        }
        draw();
    }, false);

    canvas.addEventListener('mouseup', function(evt) {
        drawingRect = false;
        editRectangle(getMousePos(canvas, evt));
        draw();
    }, false);
}

function nextRandomPage() {
    imageObj.src = 'http://dhlabsrv4.epfl.ch/iiif_ornaments/bookm-1092401744_005/full/full/0/default.jpg';
    imageObj.onload = function() {
        divToImageRatio = {w: imageObj.width/contnerDiv.clientWidth, h: imageObj.height/contnerDiv.clientHeight};
        if (divToImageRatio.w < divToImageRatio.h) {
            canvas.width = contnerDiv.clientWidth * divToImageRatio.h;
            canvas.height = imageObj.height;
        } else {
            canvas.width = imageObj.width;
            canvas.height = contnerDiv.clientHeight * divToImageRatio.w;
        }

        divToCanvasRatio = {w: canvas.width/contnerDiv.clientWidth, h: canvas.height/contnerDiv.clientHeight};

        console.log( "div: ("+contnerDiv.clientWidth+","+contnerDiv.clientHeight+")" );
        console.log( "img: ("+imageObj.width+","+imageObj.height+")" );
        console.log( "canv: ("+canvas.width+","+canvas.height+")" );

        lineWidth = max(round(max(canvas.width, canvas.height)*0.001), 1);

        draw();
        startListeners();
    };
}

function startAnnotation() {
    canvas = document.getElementById('annotationCanvas');
    contnerDiv = document.getElementById('bottM');
    context = canvas.getContext('2d');

    nextRandomPage();
}