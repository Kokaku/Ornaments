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

var browserPushSide = {
    RIGHT: "right",
    LEFT: "left"
};

var MAX_PREVIEW_PAGE = 5;

var imageObj = new Image();
var currentImagePosition = {x: 0, y: 0};
var pages = [];
var ornamentsPreview = [];
var pagesPreview = [];
var loadingQueue = [];
var selectedPage = 0;
var loading = true;
var pageBrowserPosition = Infinity;


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
        x: p.x - currentImagePosition.x,
        y: p.y - currentImagePosition.y,
        w: abs(p1.x - p2.x),
        h: abs(p1.y - p2.y)
    }
}

function mainFrameToImageCoord(position) {
    return {
      x: position.x - currentImagePosition.x,
      y: position.y - currentImagePosition.y
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
    var rect = pages[selectedPage].rectangles[rectangleId];
    var canv = ornamentsPreview[rectangleId];

    canv.width = rect.w;
    canv.height = rect.h;

    var ctx = canv.getContext('2d');
    ctx.clearRect(0, 0, canv.width, canv.height);
    ctx.drawImage(imageObj, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    ctx.stroke();
}

function saveClickPoint(mousePos) {
    var rectangles = pages[selectedPage].rectangles;
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
                x: rectangles[selectedRect.r].x + currentImagePosition.x,
                y: rectangles[selectedRect.r].y + currentImagePosition.y + rectangles[selectedRect.r].h
            };
            break;
        case "topLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + currentImagePosition.x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y + currentImagePosition.y + rectangles[selectedRect.r].h
            };
            break;
        case "bottom":
        case "right":
        case "bottomRight":
        case "center":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + currentImagePosition.x,
                y: rectangles[selectedRect.r].y + currentImagePosition.y
            };
            break;
            break;
        case "left":
        case "bottomLeft":
            selectedRectPos = {
                x: rectangles[selectedRect.r].x + currentImagePosition.x + rectangles[selectedRect.r].w,
                y: rectangles[selectedRect.r].y + currentImagePosition.y
            };
            break;
        default:
            selectedRectPos = mousePos;

    }
}

function editRectangle(mousePos) {
    var rectangles = pages[selectedPage].rectangles;
    switch(selectedRect.t) {
        case "top":
        case "bottom":
            rectangles[selectedRect.r] = getRectangle(selectedRectPos,
                {x: rectangles[selectedRect.r].x + currentImagePosition.x + rectangles[selectedRect.r].w, y: mousePos.y});
            break;
        case "right":
        case "left":
            rectangles[selectedRect.r] = getRectangle(selectedRectPos,
                {x: mousePos.x, y: rectangles[selectedRect.r].y + currentImagePosition.y + rectangles[selectedRect.r].h});
            break;
        case "center":
            rectangles[selectedRect.r].x = mousePos.x - mouseClickPos.x + selectedRectPos.x - currentImagePosition.x;
            rectangles[selectedRect.r].y = mousePos.y - mouseClickPos.y + selectedRectPos.y - currentImagePosition.y;
            break;
        default:
            rectangles[selectedRect.r] = getRectangle(selectedRectPos, mousePos);
    }
}

function setSelectedRectangle(mousePos) {
    mousePos = mainFrameToImageCoord(mousePos);
    var tolerance = lineWidth * 15;
    var bestSelection = {r: -1, t: "none", v: Infinity};

    for (i = 0; i < pages[selectedPage].rectangles.length; i++) {
        var rect = pages[selectedPage].rectangles[i];
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

    currentImagePosition = {x: canvas.width/2-imageObj.width/2, y: canvas.height/2-imageObj.height/2};
    context.drawImage(imageObj, currentImagePosition.x, currentImagePosition.y, imageObj.width, imageObj.height);

    for (i = 0; i < pages[selectedPage].rectangles.length; i++) {
        if(i == selectedRect.r) {
            context.strokeStyle="blue";
            context.lineWidth = lineWidth*2;
        } else {
            context.strokeStyle="black";
            context.lineWidth = lineWidth;
        }

        var rect = pages[selectedPage].rectangles[i];
        context.beginPath();
        context.rect(rect.x + currentImagePosition.x, rect.y + currentImagePosition.y, rect.w, rect.h);
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
            var rectangles = pages[selectedPage].rectangles;
            if(rectangles[selectedRect.r].w != 0 || rectangles[selectedRect.r].h !== 0) {
                postNewOrnament(rectangles[selectedRect.r], function(){});
            }
        }
    }, false);
}

function setSelectedPage(pageId) {
    if (pageId < 0) {
        pageId = 0;
    } else if (pageId > pagesPreview.length) {
        pageId = pagesPreview.length - 1;
    }

    if (pagesPreview.length > selectedPage) {
        pagesPreview[selectedPage].canv.className = "pagesPreview";
    }
    selectedPage = pageId;
    pagesPreview[pageId].canv.className = "pagesPreview selectedPagePreview";
    switchPage(pageId);
}

function removeAllPages() {
    for(var i=0; i<pagesPreview.length; i++) {
        document.getElementById('pagesPreview'+i).remove();
    }
    pagesPreview = [];
    pages = [];
}

function addPagePreview(side, selectPreview, newImageObj) {
    var canv = document.createElement('canvas');
    var pagePreviewDiv = document.getElementById('pagesPreview');
    var newPreviewId = 0;

    if (side == browserPushSide.RIGHT) {
        if(pagesPreview.length >= MAX_PREVIEW_PAGE) {
            if(selectedPage != 0) {
                selectedPage--;
            }
            pagePreviewDiv.removeChild(document.getElementById("pagesPreview0"));
            pagesPreview.shift();
            for (i=0; i < pagesPreview.length; i++) {
                pagesPreview[i].canv.id = "pagesPreview"+i;

            }
        }

        canv.id = "pagesPreview"+pagesPreview.length;
        pagePreviewDiv.appendChild(canv);
        pagesPreview.push({canv: canv, src: newImageObj.src});
        newPreviewId = MAX_PREVIEW_PAGE - 1;
    } else {
        if(pagesPreview.length >= MAX_PREVIEW_PAGE) {
            var lastPreviewId = MAX_PREVIEW_PAGE - 1;
            if (selectedPage != lastPreviewId) {
                selectedPage++;
            }
            pagePreviewDiv.removeChild(document.getElementById("pagesPreview" + lastPreviewId));
            pagesPreview.pop();
            for (i = 0; i < pagesPreview.length; i++) {
                pagesPreview[i].canv.id = "pagesPreview" + (i + 1);

            }
        }
        canv.id = "pagesPreview0";
        pagePreviewDiv.insertBefore(canv, pagePreviewDiv.firstChild);
        pagesPreview.unshift({canv: canv, src: newImageObj.src});
    }


    if (selectPreview) {
        setSelectedPage(newPreviewId);
    } else {
        canv.className = "pagesPreview";
    }
    canv.width = newImageObj.width;
    canv.height = newImageObj.height;

    var ctx = canv.getContext('2d');
    ctx.drawImage(newImageObj, 0, 0, newImageObj.width, newImageObj.height);

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
    ornamentsPreview = [];
    var rectangles = pages[selectedPage].rectangles;
    for (i=0; i<rectangles.length; i++) {
        createNewOrnamentsPreview();
        cutOrnamentPreview(i);
    }
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
    removeAllPages();
    loadPages(0, MAX_PREVIEW_PAGE, browserPushSide.RIGHT, 0);
}

function selectLastPage() {
    removeAllPages();
    loadPages(Infinity, MAX_PREVIEW_PAGE, browserPushSide.RIGHT, MAX_PREVIEW_PAGE-1);
}

function selectNextPage() {
    if (selectedPage < MAX_PREVIEW_PAGE - 1) {
        setSelectedPage(selectedPage+1);
    } else {
        loadPages(pageBrowserPosition+1, 1, browserPushSide.RIGHT, 0);
    }
}

function selectPreviousPage() {
    if (selectedPage > 0) {
        setSelectedPage(selectedPage-1);
    } else {
        var browserPosition = pageBrowserPosition-5;
        if (browserPosition >= 0) {
            loadPages(browserPosition, 1, browserPushSide.LEFT, 0);
        }
    }
}

function loadNextPage() {
    if( loadingQueue.length != 0 ) {
        var page = loadingQueue.shift();
        addPage(page);
    }
}

function switchPage(pageId) {
    imageObj.src = pagesPreview[pageId].src;
    imageObj.onload = function() {
        resizeMainFrame();
        loadOrnaments();
    };
}

function addPage(page) {
    var newImageObj = new Image();
    newImageObj.src = page.url;
    newImageObj.onload = function() {
        if (page.side == browserPushSide.RIGHT) {
            if (pages.length >= MAX_PREVIEW_PAGE) {
                pages.shift();
            }
            pages.push(page);

        } else {
            if (pages.length >= MAX_PREVIEW_PAGE) {
                pages.pop();
            }
            pages.unshift(page);
        }

        addPagePreview(page.side, page.show, newImageObj);
        if (page.show) {
            imageObj = newImageObj;
            resizeMainFrame();
        }
        loadNextPage();
    };
}

function loadPages(browserPosition, limit, pushSide, pageToShow) {
    loading = true;
    var params = "position="+browserPosition+"&limit="+limit;
    queryDB("/annotatedPages", params, function(result) {
        if (result.length > 0) {
            var json = JSON.parse(result);
            if (pushSide == browserPushSide.RIGHT) {
                pageBrowserPosition = json.position;
            } else {
                pageBrowserPosition = json.position + MAX_PREVIEW_PAGE - json["res"].length;
            }
            for (j = 0; j < json["res"].length; j++) {
                loadingQueue.push({
                    show: j == pageToShow,
                    side: pushSide,
                    url: json["res"][j]["_id"],
                    rectangles: parseOrnaments(json["res"][j]["ornaments"])
                });
            }
            loadNextPage();
        }
        loading = false;
    });
}

function addNewRandomPage() {
    getNewRandomPage(addNewPage);
}

function addNewPage(url) {
    loadingQueue.push({
        show: true,
        side: browserPushSide.RIGHT,
        url: url,
        rectangles: []});
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

    //TODO Start after 1st image loaded
    startListeners();
    selectLastPage();
}

function getNewRandomPage(callback) {
    queryDB("/nextRandomPage", "", callback);
}

function queryDB(query, param, callback) {
    var http = new XMLHttpRequest();
    if(param.length == 0) {
        http.open("GET", query, true);
    } else {
        http.open("POST", query, true);
    }

    http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    http.onreadystatechange = function() {
        if(http.readyState == 4 && http.status == 200) {
            callback(http.responseText);
        }
    };
    http.send(param);
}

function postNewOrnament(rectangle, callback) {
    var params = "page="+imageObj.src+"&x="+rectangle.x+"&y="+rectangle.y+"&w="+rectangle.w+"&h="+rectangle.h;
    queryDB("/newOrnament", params, callback);
}

function parseOrnaments(strOrnaments) {
    var ornaments = [];
    for (i=0; i<strOrnaments.length; i++) {
        ornaments.push({
            x: parseFloat(strOrnaments[i].x),
            y: parseFloat(strOrnaments[i].y),
            w: parseFloat(strOrnaments[i].w),
            h: parseFloat(strOrnaments[i].h)
        });
    }
    return ornaments;
}
