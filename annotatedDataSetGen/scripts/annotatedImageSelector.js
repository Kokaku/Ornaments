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

var MAX_PREVIEW_PAGE = 5;

var imageObj = new Image();
var imagePos = {x: 0, y: 0};
var rectangles = [];
var ornamentsPreview = [];
var pagesPreview = [];
var loadingQueue = [];
var selectedPage = 0;
var loading = true;

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
        x: p.x - imagePos.x,
        y: p.y - imagePos.y,
        w: abs(p1.x - p2.x),
        h: abs(p1.y - p2.y)
    }
}

function mainFrameToImageCoord(position) {
    return {
      x: position.x - imagePos.x,
      y: position.y - imagePos.y
    }
}

function createNewOrnamentsPreview() {
    var canv = document.createElement('canvas');
    canv.id = "ornamentsPreview"+ornamentsPreview.length;
    canv.className = "ornamentsPreview";
    document.getElementById('ornamentPreview').appendChild(canv);
    ornamentsPreview.push(canv);

    canv.addEventListener('mousemove', function(evt) {
        selectedRect = {r: canv.id.substr(canv.id.length - 1), t: "none"};
        draw();
    }, false);
}

function cutOrnamentPreview(rectangleId) {
    var rect = rectangles[rectangleId];
    var canv = ornamentsPreview[rectangleId];

    canv.width = rect.w;
    canv.height = rect.h;

    var ctx = canv.getContext('2d');
    ctx.clearRect(0, 0, canv.width, canv.height);
    ctx.drawImage(imageObj, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    ctx.stroke();
}

function saveClickPoint(mousePos) {
    switch(selectedRect.t) {
        case "none":
            createNewOrnamentsPreview();
            selectedRectPos = mousePos;
            selectedRect.r = rectangles.length;
            rectangles.push(getRectangle(selectedRectPos, selectedRectPos));
            break;
        case "top":
        case "topRight":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + imagePos.x,
                y: rectangles[selectedRect.r].y + imagePos.y + rectangles[selectedRect.r].h
            };
            break;
        case "topLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + imagePos.x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y + imagePos.y + rectangles[selectedRect.r].h
            };
            break;
        case "bottom":
        case "right":
        case "bottomRight":
        case "center":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + imagePos.x,
                y: rectangles[selectedRect.r].y + imagePos.y
            };
            break;
            break;
        case "left":
        case "bottomLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + imagePos.x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y + imagePos.y
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
                {x: rectangles[selectedRect.r].x + imagePos.x + rectangles[selectedRect.r].w, y: mousePos.y});
            break;
        case "right":
        case "left":
            rectangles[selectedRect.r] = getRectangle(selectedRectPos,
                {x: mousePos.x, y: rectangles[selectedRect.r].y + imagePos.y + rectangles[selectedRect.r].h});
            break;
        case "center":
            rectangles[selectedRect.r].x = mousePos.x - mouseClickPos.x + selectedRectPos.x - imagePos.x;
            rectangles[selectedRect.r].y = mousePos.y - mouseClickPos.y + selectedRectPos.y - imagePos.y;
            break;
        default:
            rectangles[selectedRect.r] = getRectangle(selectedRectPos, mousePos);
    }
}

function setSelectedRectangle(mousePos) {
    mousePos = mainFrameToImageCoord(mousePos);
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

    imagePos = {x: canvas.width/2-imageObj.width/2, y: canvas.height/2-imageObj.height/2};
    context.drawImage(imageObj, imagePos.x, imagePos.y, imageObj.width, imageObj.height);

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
        context.rect(rect.x + imagePos.x, rect.y + imagePos.y, rect.w, rect.h);
        context.stroke();
    }
}

function startListeners() {
    var drawingRect = false;

    canvas.addEventListener('mousedown', function(evt) {
        if (!loading) {
            drawingRect = true;
            mouseClickPos = getMousePos(canvas, evt);
            saveClickPoint(mouseClickPos);
        }
    }, false);

    canvas.addEventListener('mousemove', function(evt) {
        if (!loading) {
            var mousePos = getMousePos(canvas, evt);
            if (drawingRect) {
                editRectangle(mousePos);
            } else {
                setSelectedRectangle(mousePos);
            }
            draw();
        }
    }, false);

    canvas.addEventListener('mouseup', function(evt) {
        if (!loading) {
            drawingRect = false;
            editRectangle(getMousePos(canvas, evt));
            cutOrnamentPreview(selectedRect.r);
            draw();
        }
    }, false);
}

function setSelectedPage(pageId) {
    if (pagesPreview.length > selectedPage) {
        pagesPreview[selectedPage].canv.className = "pagesPreview";
    }
    selectedPage = pageId;
    pagesPreview[pageId].canv.className = "pagesPreview selectedPagePreview";
    switchPage(pageId);
}

function addPagePreview() {
    var canv = document.createElement('canvas');

    if(pagesPreview.length >= MAX_PREVIEW_PAGE) {
        if(selectedPage != 0) {
            selectedPage--;
        }
        document.getElementById('pagesPreview').removeChild(document.getElementById("pagesPreview0"));
        pagesPreview.splice(0, 1);
        for (i=0; i < pagesPreview.length; i++) {
            pagesPreview[i].canv.id = "pagesPreview"+i;

        }
    }

    canv.id = "pagesPreview"+pagesPreview.length;
    document.getElementById('pagesPreview').appendChild(canv);
    pagesPreview.push({canv: canv, src: imageObj.src});
    setSelectedPage(pagesPreview.length - 1);

    canv.width = imageObj.width;
    canv.height = imageObj.height;

    var ctx = canv.getContext('2d');
    ctx.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height);

    canv.addEventListener('mouseup', function(evt) {
        var pageId = parseInt(canv.id.substr(canv.id.length - 1));
        setSelectedPage(pageId);
    }, false);
}

function loadOrnaments() {
    var ornamentPreviewDiv = document.getElementById("ornamentPreview");
    while (ornamentPreviewDiv.firstChild) {
        ornamentPreviewDiv.removeChild(ornamentPreviewDiv.firstChild);
    }
    rectangles = [];
    ornamentsPreview = [];
    draw();
}

function resizeMainFrame() {
    divToImageRatio = {w: imageObj.width / contnerDiv.clientWidth, h: imageObj.height / contnerDiv.clientHeight};
    if (divToImageRatio.w < divToImageRatio.h) {
        canvas.width = contnerDiv.clientWidth * divToImageRatio.h;
        canvas.height = imageObj.height;
    } else {
        canvas.width = imageObj.width;
        canvas.height = contnerDiv.clientHeight * divToImageRatio.w;
    }

    divToCanvasRatio = {w: canvas.width / contnerDiv.clientWidth, h: canvas.height / contnerDiv.clientHeight};
    lineWidth = max(round(max(canvas.width, canvas.height) * 0.001), 1);
    draw();
}

function selectFirstPage() {
    console.log("Select first page not implemented yet.");
}

function selectLastPage() {
    console.log("Select last page not implemented yet.");
}

function selectNextPage() {
    if (selectedPage < MAX_PREVIEW_PAGE - 1) {
        setSelectedPage(selectedPage+1);
    } else {
        //TODO
        console.log("ok next");
    }
}

function selectPreviousPage() {
    if (selectedPage > 0) {
        setSelectedPage(selectedPage-1);
    } else {
        //TODO
        console.log("ok previous");
    }
}

function loadNextPage() {
    if( loadingQueue.length != 0 ) {
        var page = loadingQueue.shift();
        addPage(pageToURL(page));
    }
}

function switchPage(pageId) {
    imageObj.src = pagesPreview[pageId].src;
    imageObj.onload = function() {
        resizeMainFrame();
        loadOrnaments();
    };
}

function addPage(pageURL) {
    imageObj.src = pageURL;
    imageObj.onload = function() {
        addPagePreview();
        resizeMainFrame();
        loadNextPage();
    };
}

function loadPages() {
    loading = true;
    loadingQueue = pages.slice(0);
    loadNextPage();
    loading = false;
}

function addNewRandomPage() {
    loadingQueue.push(getNewRandomPage());
    if( !loading ) {
        loading = true;
        loadNextPage();
    }
    loading = false;
}

function startAnnotation() {
    canvas = document.getElementById('annotationCanvas');
    contnerDiv = document.getElementById('page');
    context = canvas.getContext('2d');

    startListeners();
    loadPages();
}
