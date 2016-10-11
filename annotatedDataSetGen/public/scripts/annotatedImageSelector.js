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
var MIDDLE_PREVIEW_ID = (MAX_PREVIEW_PAGE - 1) / 2;

var imageObj = new Image();
var deleteImage = new Image();
var currentImagePosition = {x: 0, y: 0};
var pages = [];
var ornamentsPreview = [];
var pagesPreview = [];
var loadingQueue = [];
var selectedPage = -1;
var loading = true;
// Number of page to skip to obtain last page preview
var pageBrowserPosition = Infinity;
var pageBrowserCount = Infinity;
var ornamentsFilter = false;


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
var min = Math.min;
var round = Math.round;

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * divToCanvasRatio.w,
        y: (evt.clientY - rect.top) * divToCanvasRatio.h
    };
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

function enableSelectTagOrnament() {
    var ornamentType = document.getElementById("ornamentType");
    var ornamentNature = document.getElementById("ornamentNature");

    if(selectedRect.r >= 0 && selectedRect.r < pages[selectedPage].rectangles.length) {
        var rectangle = pages[selectedPage].rectangles[selectedRect.r];

        if(!("nature" in rectangle)) {
            rectangle.nature = "Unknown";
        }
        if(!("type" in rectangle)) {
            rectangle.type = "Unknown";
        }

        ornamentType.value = rectangle.type;
        ornamentNature.value = rectangle.nature;
        ornamentType.disabled = false;
        ornamentNature.disabled = false;
    } else {
        ornamentType.disabled = true;
        ornamentNature.disabled = true;
    }
}

function createNewOrnamentsPreview() {
    var canv = document.createElement('canvas');
    canv.id = "ornamentsPreview"+ornamentsPreview.length;
    canv.className = "ornamentsPreview";
    document.getElementById('ornamentPreview').appendChild(canv);
    ornamentsPreview.push(canv);

    canv.addEventListener('mousedown', function(evt) {
        selectedRect = {r: canv.id.substr(canv.id.length - 1), t: "none"};

        ornamentPreviewDiv = document.getElementById('ornamentPreview');
        var mousePosX = (evt.clientX - canv.getBoundingClientRect().left);
        if (mousePosX > ornamentPreviewDiv.clientWidth*0.9) {
            if (confirm('Are you sure you want to delete this ornament from the database?')) {
                removeOrnament(selectedRect.r, function(){});
                jumpToGivenPage(pageBrowserPosition-1);
            }
        } else {
            enableSelectTagOrnament();
            draw();
        }
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
    ctx.drawImage(deleteImage, 0, 0, deleteImage.width, deleteImage.height, rect.w*0.9, 0, rect.w*0.1, rect.w*0.1);
    ctx.stroke();
}

function saveClickPoint(mousePos) {
    var rectangles = pages[selectedPage].rectangles;
    switch(selectedRect.t) {
        case "none":
            createNewOrnamentsPreview();
            selectedRectPos = mousePos;
            selectedRect.r = rectangles.length;
            enableSelectTagOrnament();
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

    for (var i = 0; i < pages[selectedPage].rectangles.length; i++) {
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

        for (var side in selectionArea) {
            var isAreaACorner = isACorner(side);
            var isBestAreaACorner = isACorner(bestSelection.t);
            if ((selectionArea[side] < Infinity && isAreaACorner && !isBestAreaACorner) ||
                ((!isAreaACorner || isBestAreaACorner) && selectionArea[side] < bestSelection.v)) {
                bestSelection = {r: i, t: side, v: selectionArea[side]};
            }
        }
    }

    selectedRect = {r: bestSelection.r, t: bestSelection.t};
    enableSelectTagOrnament();
    canvas.style.cursor = cusorsType[selectedRect.t];
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    currentImagePosition = {x: canvas.width/2-imageObj.width/2, y: canvas.height/2-imageObj.height/2};
    if  (imageObj.width >= 5 && imageObj.height >= 5) {
        context.drawImage(imageObj, currentImagePosition.x, currentImagePosition.y, imageObj.width, imageObj.height);
    }

    for (var i = 0; i < pages[selectedPage].rectangles.length; i++) {
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
            if(rectangles[selectedRect.r].w != 0 && rectangles[selectedRect.r].h !== 0) {

                switch(selectedRect.t) {
                    case "none":
                        postNewOrnament(rectangles[selectedRect.r], function(){});
                        break;
                    default:
                        postEditedOrnament(rectangles[selectedRect.r], selectedRect.r, function(){});
                }
            }
        }
    }, false);
}

function getPageGlobalPosition(pageId) {
    return pageBrowserPosition - MAX_PREVIEW_PAGE + 2 + pageId;
}

function setBrowserPosition() {
    document.getElementById("pageBrowserPosition").innerHTML = getPageGlobalPosition(selectedPage)+"/"+pageBrowserCount;
}

function setSelectedPage(pageId) {
    if (pageId < 0) {
        pageId = 0;
    } else if (pageId > pagesPreview.length) {
        pageId = pagesPreview.length - 1;
    }

    if (pagesPreview.length > selectedPage && selectedPage >= 0) {
        pagesPreview[selectedPage].canv.className = "pagesPreview";
    }
    selectedPage = pageId;
    pagesPreview[pageId].canv.className = "pagesPreview selectedPagePreview";
    switchPage(pageId);
    setBrowserPosition();
    putSelectedPagesInMiddle();
    selectedRect = {r: -1, t: "none"};
    enableSelectTagOrnament();
}

function putSelectedPagesInMiddle() {
    if (!loading && selectedPage != MIDDLE_PREVIEW_ID) {
        var pushSide;
        var browserPosition;
        var globalPagePosition = getPageGlobalPosition(selectedPage);
        var numberPagesToPush = Math.abs(MIDDLE_PREVIEW_ID - selectedPage);

        if(selectedPage > MIDDLE_PREVIEW_ID) {
            numberPagesToPush = min(
                pageBrowserCount - globalPagePosition - (MAX_PREVIEW_PAGE - selectedPage - 1),
                numberPagesToPush);
            browserPosition = getPageGlobalPosition(MAX_PREVIEW_PAGE - 1);
            pushSide = browserPushSide.RIGHT;
        } else {
            numberPagesToPush = min(globalPagePosition - 1 - selectedPage, numberPagesToPush);
            browserPosition = getPageGlobalPosition(0) - numberPagesToPush - 1;
            pushSide = browserPushSide.LEFT;
        }

        if (numberPagesToPush > 0) {
            loadPages(browserPosition, numberPagesToPush, pushSide, -1);
        }
    }
}

function removeAllPages() {
    for (var i=0; i<pagesPreview.length; i++) {
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
                setBrowserPosition();
            }
            pagePreviewDiv.removeChild(document.getElementById("pagesPreview0"));
            pagesPreview.shift();
            for (var i=0; i < pagesPreview.length; i++) {
                pagesPreview[i].canv.id = "pagesPreview"+i;

            }
        }

        canv.id = "pagesPreview"+pagesPreview.length;
        pagePreviewDiv.appendChild(canv);
        pagesPreview.push({canv: canv, src: newImageObj.src});
        newPreviewId = pagesPreview.length - 1;
    } else {
        if (selectedPage != MAX_PREVIEW_PAGE - 1) {
            selectedPage++;
            setBrowserPosition();
        }
        if(pagesPreview.length >= MAX_PREVIEW_PAGE) {
            var lastPreviewId = pagesPreview.length - 1;
            pagePreviewDiv.removeChild(document.getElementById("pagesPreview" + lastPreviewId));
            pagesPreview.pop();
        }

        for (var i = 0; i < pagesPreview.length; i++) {
            pagesPreview[i].canv.id = "pagesPreview" + (i + 1);

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
    for (var i=0; i<rectangles.length; i++) {
        createNewOrnamentsPreview();
        cutOrnamentPreview(i);
    }
    draw();
}

function resizeMainFrame() {
    if (imageObj.width >= 5 && imageObj.height >= 5) {
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
}

function jumpToPage() {
    var pagePositionInput = document.getElementById("jumpPagePosition");
    jumpToGivenPage(parseInt(pagePositionInput.value));
}

function jumpToGivenPage(pageId) {
    loading = true;
    var pageToSkip = pageId - MIDDLE_PREVIEW_ID - 1;
    var showPosition = MIDDLE_PREVIEW_ID;


    if (pageToSkip < 0) {
        showPosition = pageToSkip+2;
        pageToSkip = 0;
    } else if (pageToSkip > pageBrowserCount - MAX_PREVIEW_PAGE) {
        showPosition = pageToSkip - pageBrowserCount + MAX_PREVIEW_PAGE + MIDDLE_PREVIEW_ID;
        pageToSkip = pageBrowserCount - MAX_PREVIEW_PAGE;
    }

    removeAllPages();
    loadPages(pageToSkip, MAX_PREVIEW_PAGE, browserPushSide.RIGHT, showPosition);
}

function enableOrnamentsFilter() {
    ornamentsFilter = document.getElementById("ornamentsFilter").checked;
    document.getElementById("newRandomPage").disabled = ornamentsFilter;
    selectLastPage(function() {});
}

function selectFirstPage() {
    removeAllPages();
    loadPages(0, MAX_PREVIEW_PAGE, browserPushSide.RIGHT, 0);
}

function selectLastPage(callback) {
    callback = callback || function(){};
    removeAllPages();
    loadPages(Infinity, MAX_PREVIEW_PAGE, browserPushSide.LEFT, MAX_PREVIEW_PAGE-1, callback);
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

function loadNextPage(callbackFinishQueue) {
    if( loadingQueue.length != 0 ) {
        var page = loadingQueue.shift();
        addPage(page, callbackFinishQueue);
    } else {
        callbackFinishQueue();
        loading = false;
    }
}

function switchPage(pageId) {
    imageObj.src = pagesPreview[pageId].src;
    imageObj.onload = function() {
        resizeMainFrame();
        loadOrnaments();
    };
}

function addPage(page, callbackFinishQueue) {
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
        loadNextPage(callbackFinishQueue);
    };
}

function loadPages(browserPosition, limit, pushSide, pageToShow, callback) {
    callback = callback || function() {};
    loading = true;
    var params = "position="+browserPosition+"&limit="+limit+"&filter="+ornamentsFilter;
    queryDB("/annotatedPages", params, function(result) {
        if (result.length > 0) {
            var json = JSON.parse(result);
            if (pushSide == browserPushSide.RIGHT) {
                pageBrowserPosition = json.position;
            } else {
                pageBrowserPosition = json.position + MAX_PREVIEW_PAGE - json["res"].length;
            }
            pageBrowserCount = json.annotatedPagesCount;

            if (json["res"].length != limit) {
                if (pageToShow > 0 && pageToShow < limit && pageToShow >= json["res"].length) {
                    pageToShow = json["res"].length - 1;
                }
                limit = json["res"].length;
            }

            function pushOnLoadingQueue(id) {
                loadingQueue.push({
                    show: id == pageToShow,
                    side: pushSide,
                    url: json["res"][id]["_id"],
                    rectangles: parseOrnaments(json["res"][id]["ornaments"])
                });
            }
            if(pushSide == browserPushSide.RIGHT) {
                for (var j = 0; j < json["res"].length; j++) {
                    pushOnLoadingQueue(j);
                }
            } else {
                for (var j = json["res"].length - 1; j >=0 ; j--) {
                    pushOnLoadingQueue(j);
                }
            }
            loadNextPage(callback);
        } else {
            if(loadingQueue.length == 0 ) {
                loading = false;
            }
            callback();
        }
    });
}

function addNewRandomPage() {
    if (pageBrowserCount != pageBrowserPosition + 1 && pagesPreview.length == MAX_PREVIEW_PAGE) {
        selectLastPage(addNewRandomPage);
    } else {
        loading = true;
         queryDB("/nextRandomPage", "", function (url) {
             pageBrowserPosition++;
             pageBrowserCount++;
             loadingQueue.push({
                 show: true,
                 side: browserPushSide.RIGHT,
                 url: url,
                 rectangles: []
             });
             if(pageBrowserCount == Infinity) {
                 pageBrowserCount = 0;
                 pageBrowserPosition = 0;
             }
            loadNextPage(function(){});
         });
    }
}

function startAnnotation() {
    loading = true;
    canvas = document.getElementById('annotationCanvas');
    contnerDiv = document.getElementById('page');
    context = canvas.getContext('2d');

    deleteImage.src = "public/css/delete.png";

    startListeners();
    selectLastPage();
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

function postEditedOrnament(rectangle, rectangleId, callback) {
    if(!("nature" in rectangle)) {
        rectangle.nature = "Unknown";
    }
    if(!("type" in rectangle)) {
        rectangle.type = "Unknown";
    }

    var params = "page="+imageObj.src+"&id="+rectangleId+
        "&x="+rectangle.x+
        "&y="+rectangle.y+
        "&w="+rectangle.w+
        "&h="+rectangle.h+
        "&nature="+rectangle.nature+
        "&type="+rectangle.type;

    queryDB("/editOrnament", params, callback);
}


function removeOrnament(rectangleId, callback) {
    var params = "page="+imageObj.src+"&id="+rectangleId;

    queryDB("/removeOrnament", params, callback);
}

function parseOrnaments(strOrnaments) {
    var ornaments = [];
    for (var i=0; i<strOrnaments.length; i++) {
        ornaments.push({
            x: parseFloat(strOrnaments[i].x),
            y: parseFloat(strOrnaments[i].y),
            w: parseFloat(strOrnaments[i].w),
            h: parseFloat(strOrnaments[i].h),
            type: strOrnaments[i].type,
            nature: strOrnaments[i].nature
        });
    }
    return ornaments;
}

function onSelectOrnamentType(select) {
    var selectedOption = select.options[select.selectedIndex].value;
    var rectangle = pages[selectedPage].rectangles[selectedRect.r];

    rectangle.type = selectedOption;
    postEditedOrnament(rectangle, selectedRect.r, function(){});
}

function onSelectOrnamentNature(select) {
    var selectedOption = select.options[select.selectedIndex].value;
    var rectangle = pages[selectedPage].rectangles[selectedRect.r];

    rectangle.nature = selectedOption;
    postEditedOrnament(rectangle, selectedRect.r, function(){});
}