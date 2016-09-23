var pages = [
    {id: 1, bookId: 1092401744},
    {id: 2, bookId: 1092401744},
    {id: 3, bookId: 1092401744},
    {id: 4, bookId: 1092401744},
    {id: 5, bookId: 1092401744}];

function getNewRandomPage() {
    var page = {id: pages.length+1, bookId: 1092401744};
    pages.push(page);
    return page;
}

function pageToURL(page) {
    return "http://dhlabsrv4.epfl.ch/iiif_ornaments/bookm-"+page.bookId+"_"+page.id+"/full/full/0/default.jpg";
}