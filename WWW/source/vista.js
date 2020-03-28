
vista = function (
    listener,
    mapContainer,
    size,
    staAddress
) {

    /* Global Variables STARTS */
    var heatdata;
    var heatmapInstance;
    var heatmapInstanceflag = 0;
    var animeDiv = [];

    var mapOptions = {
        nodes: {
            shape: 'dot',
            borderWidth: 2
        },
        interaction: {
            hover: false,
            selectable: false,
            dragNodes: false,
            dragView: false,
            zoomView: false
        },
        physics: false
    };
    
    var mapData = {
        nodes: new vis.DataSet(),
        edges: new vis.DataSet()
    };
    
    var map = new vis.Network(mapContainer, mapData, mapOptions);
    
    var data = {
        headerConvention: ["index","timestamp","fixDuration","posX","posY","stimuliName"],
        outScreenStrings: ["ScreenRec","No media","undefined"],
        lastFileID: -1,
        AOIs: new Array(),
        categories: new Array(),
        main: new Array(),
        firstClick: null,
        AOIBlock: false,
        download: null
    };
    
    // Heatmap Variables
   
    
    var heatmapDataPoint = {
        h_x_pos: new Array(), 
        h_y_pos: new Array(),
        h_fix_value: new Array()

    };
    
    

    var heatmapFileData = new Array(); //we dont need this actually we can use fileData that is already existing.
    
    var counter = 0;
    var counterk = 0
    var animatedSTAseq = new Array();
    /* Global Variables ENDS */
    
    /* File Module Functions STARTS */
        
    this.readFile = function(file){
        //alert("in readfile");
        if(file.files && file.files.length > 0){

            for(var i = 0; file.files.length > i; i++){
                var reader = new FileReader();
                reader.onload = fileLoader;
                reader.readAsText(file.files[i]);
            }
        }
    };
    
    var fileLoader = function(event){
        //alert("in fileloader");
        data.lastFileID++;

        var fileContent = event.target.result;	
        var lines = fileContent.split(/\r\n/);
        
        var fileHeaders = new Array();
        fileHeaders = lines[0].split(/\t/);

        var fileData = new Array();
        for(var i = 1; lines.length > i; i++){
            var temp = lines[i].split(/\t/);
            if(temp != ""){
                fileData[i-1] = new Object();
                heatmapFileData[i-1] = new Object();
                for(var k = 0; temp.length > k; k++){
                    var indexName = fileHeaders[k];
                    fileData[i-1][indexName] = temp[k];
                    heatmapFileData[i-1][indexName] = temp[k];
                }            
            }
        }
        //heatmapFileData=fileData;
        
        parseData(projectData(fileHeaders, fileData,
                ["index","timestamp","fixDuration","posX","posY","stimuliName"]),data.lastFileID);
    };
    
    /* File Module Functions ENDS */
    
    /* Data Module Functions STARTS */
    
    function projectData(fileHeaders, fileData, originalHeaders){
        var projectedData = new Array();

        for(var i = 0; fileData.length > i; i++){
            projectedData[i] = new Object(); 
            for(var j  = 0; originalHeaders.length > j; j++){
                var newIndexName = originalHeaders[j];
                var oldIndexName = fileHeaders[j];

                projectedData[i][newIndexName] = fileData[i][oldIndexName];
            }
        }

        return projectedData;
    }
    
    function parseData(projectedData,fileID){
        var lastCategoryName = "";

        for(var i = 0; projectedData.length > i; i++){
            var categoryName = projectedData[i][data.headerConvention[5]];

            if(checkCategoryName(categoryName)){
                if(!isCategoryExist(categoryName)){
                    data.categories.push({name: categoryName, title: null, img: null, height: 0,
                        color: getRandomColor(), participants: [fileID]});
                    data.main[categoryName] = new vis.DataSet();
                    fetchPageTitleToData(categoryName);
                } else if(!isParticipantExistInCategory(categoryName,fileID)){
                    data.categories[findCategoryIndex(categoryName)].participants.push(fileID);
                }

                var lastIndex = data.main[categoryName].add(projectedData[i]);
                var isConnected = (lastCategoryName == categoryName ? true : false);
                data.main[categoryName].update({id: lastIndex, participantID: fileID, isConnected: isConnected});
            }
            
            lastCategoryName = categoryName;
        }
        listener("DATACHANGE");
    }
    
    function filterStimuli(stimuliInstant,filter){
        var flag = true;
        
        if(filter.participants.indexOf(stimuliInstant.participantID) != -1){
            flag = true;
        } else{
            flag = false;
        }
        
        return flag;
    }
    
    /* Data Module Functions ENDS */
    
    /* Category Functions STARTS */
    
    function isCategoryExist(categoryName){
        for(var i = 0; data.categories.length > i; i++){
            if(data.categories[i].name == categoryName){
                return true;
            }
        }

        return false;
    }
    
    function findCategoryIndex(categoryName){
        var categoryIndex;
        for(categoryIndex = 0; data.categories[categoryIndex].name != categoryName; categoryIndex++);

        return categoryIndex;
    };

    function checkCategoryName(categoryName){
        for(var i = 0; data.outScreenStrings.length > i; i++){
            if(data.outScreenStrings[i] == categoryName){
                return false;
            }
        }

        return true;
    }
    
    function isParticipantExistInCategory(categoryName, participantID){
        var categoryIndex = findCategoryIndex(categoryName);
        for(var i = 0; data.categories[categoryIndex].participants.length > i; i++){
            if(data.categories[categoryIndex].participants[i] == participantID){
                return true;
            }
        }

        return false;
    }
    
    /* Category Functions ENDS */
    
    /* Visualization Module Functions STARTS */
    
    function createVisualMap(visualizationData){
        mapData.nodes.clear();
        mapData.edges.clear();

        mapData.nodes.update(visualizationData.nodes);
        mapData.edges.update(visualizationData.edges);
    }
    
    this.showGazePath = function (stimuliName, filter = null) {// olan grafa arka plan koyuyor tek işi bu.
        if (heatmapInstanceflag == 1) {
            heatdata = {
                max: 0,
                data: []
            };
            heatmapInstance.setData(heatdata);
            clearDataforHeatmap();
        }
        listener("LOADERSTART");
        if (filter != null && filter.img != null) {
            alert("hello 2");
            fetchBackgroundImage(stimuliName, filter.img);
        } else{
            fetchBackgroundImage(stimuliName);
        }

        createVisualMap(createGazePath(stimuliName, filter));

    };
    
    function createGazePath(stimuliName, filter){//dön
        var stimuliData;
        if(filter != null){
            stimuliData = data.main[stimuliName].get({
                filter: function (stimuliInstant) {
                    return filterStimuli(stimuliInstant,filter) ;
                }
            });
        } else{
            stimuliData = data.main[stimuliName].get();
        }
        
        var nodes = new Array();
        var edges = new Array();
        
        for(var i=0; stimuliData.length > i; i++){
            nodes.push(convertToVisualNode(i,stimuliData[i]));

            if(i > 0 && stimuliData[i]["isConnected"] == true){
                edges.push({
                   from: i-1,
                   to: i
                });
            }
        }
        return {nodes, edges};
    }

    function clearDataforHeatmap()
    {
        for (var i = 0; heatmapDataPoint.h_fix_value[i]!=null; i++)
        {
            heatmapDataPoint.h_fix_value[i] = null;
            heatmapDataPoint.h_x_pos[i] = null;
            heatmapDataPoint.h_y_pos[i] = null;
        }
        counter = 0;

    }

    function convertToVisualNode(index, stimuliInstant) {
        //loadDataforHeatmap(stimuliInstant);
        heatmapDataPoint.h_fix_value[counter]=stimuliInstant[data.headerConvention[2]];
        heatmapDataPoint.h_x_pos[counter]=stimuliInstant[data.headerConvention[3]];
        heatmapDataPoint.h_y_pos[counter]=stimuliInstant[data.headerConvention[4]];
        counter=counter+1;
        //alert("****");

        // DATAYI ALMAYI BAŞARDIK
        
       return {
         id: index,
         label: stimuliInstant[data.headerConvention[0]],
         value: toRealValue(parseInt(stimuliInstant[data.headerConvention[2]])),// fix time arrayi
         x: toRealX(parseInt(stimuliInstant[data.headerConvention[3]])),// x koordinat arrayi
         y: toRealY(parseInt(stimuliInstant[data.headerConvention[4]])),// y koordinat arrayi
         group: parseInt(stimuliInstant["participantID"]),
       };
        
    }

       
    
    function toRealX(x){ return x*(size.width/size.dataW); }
    function toRealY(y){ return y*(size.height/size.dataH); }
    function toDataX(x){ return x*(size.dataW/size.width); }
    function toDataY(y){ return y*(size.dataH/size.height); }
    function toRealValue(value){ return value * ((size.width/size.dataW) + (size.height/size.dataH))/2 };
    
    /* Visualization Module Functions ENDS */
    
    /* WEBPAGE API Module Functions STARTS */
    
    this.getListOfCategories = function(){
        return data.categories;
    }
    
    /* WEBPAGE API Module Functions ENDS */
    
    /* Misc. Module Functions STARTS */
        
    function fetchBackgroundImage(imgAddress, imgExternal = null){
        var categoryIndex = findCategoryIndex(imgAddress);
        
        if(data.categories[categoryIndex].img != null){
            $('#background').height(size.height);
            $('#background').css('background-image', 'url(' + data.categories[categoryIndex].img + ')');
            
            listener("LOADEREND");
            
        } else if(imgExternal != null){
            var cropIMG = new Image();
            cropIMG.crossOrigin = "Anonymous";
            cropIMG.onload = function(){
                var cropCanvas = document.createElement('canvas');
                var cropContext = cropCanvas.getContext('2d');
                cropCanvas.width = size.width;
                cropCanvas.height = size.height;
                
                var cropHeight = (cropIMG.height > size.height)? size.height:cropIMG.height;
                cropContext.drawImage(cropIMG, 0, 0, cropIMG.width, cropHeight, 0, 0, size.width, size.height);
                
                var img = cropCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                $('#background').height(size.height);
                $('#background').css('background-image', 'url(' + img + ')');
                data.categories[categoryIndex].img = img;
                data.categories[categoryIndex].height = cropIMG.height;
                
                listener("LOADEREND");
            }
            cropIMG.src = imgExternal;
            
        } else if(data.categories[categoryIndex].img == null){
            html2canvas(imgAddress,{
                proxy: "proxy.php",
                allowTaint: true,
                width: size.dataW,
                height: size.dataH,
            }
            ).then(function(canvas) {
                //Cropping
                var cropCanvas = document.createElement('canvas');
                var cropContext = cropCanvas.getContext('2d');
                cropCanvas.width = size.width;
                cropCanvas.height = size.height;
                
                var cropHeight = (canvas.height > size.height)? size.height:canvas.height;
                cropContext.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, size.width, size.height);
                
                var img = cropCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                $('#background').height(size.height);
                $('#background').css('background-image', 'url(' + img + ')');
                data.categories[categoryIndex].img = img;
                data.categories[categoryIndex].height = canvas.height;
                
                listener("LOADEREND");
            });
        } else{
        }
    }
    
    function fetchPageTitleToData(titleAddress){
        var title;
        $.ajax({
            url: "proxy.php?url="+titleAddress,
            success: function(data) {
                var matches = data.match(/<title>(.*?)<\/title>/);
                if(matches == null){
                    title = titleAddress;
                } else{
                    title = matches[1];
                }
            },
            async: false
        });
        data.categories[findCategoryIndex(titleAddress)].title = title;
        listener("DATACHANGE");
    }
    
    function isPointAvailable(x,y){
        for(var i = 0; data.AOIs.length > i; i++){
            var area = data.AOIs[i];
            var endX = area.startX + area.lengthX;
            var endY = area.startY + area.lengthY;
            if(x > area.startX && y > area.startY &&
                x < endX && y < endY){
                return false;
            } else{
                return true;
            }
        }
        return true;
    }
    
    function generateAOIIndex(){
        var max = 0;
        for(var i = 0; data.AOIs.length > i; i++){
            if(data.AOIs[i].index > max){
                max = data.AOIs[i].index;
            }
        }
        return max+1;
    }
    
    function getAOIIndex(index){
        var i;
        for(i = 0; data.AOIs.length > i && data.AOIs[i].index != index; i++);
        
        return (i != data.AOIs.length)? i:-1;
    }
    
    this.addAOIBlock = function(AOIBlock){
        data.AOIBlock = AOIBlock;
    }
    
    function addAOI(currentClick){
        if(isPointAvailable(toDataX(currentClick.x), toDataY(currentClick.y))){
            if(data.firstClick == null){
                data.firstClick = currentClick;
            } else{
                var startX, startY, lengthX, lengthY;
                if(data.firstClick.x > currentClick.x){
                    startX = currentClick.x;
                    lengthX = data.firstClick.x - currentClick.x;
                } else{
                    startX = data.firstClick.x;
                    lengthX = currentClick.x - data.firstClick.x;
                }

                if(data.firstClick.y > currentClick.y){
                    startY = currentClick.y;
                    lengthY = data.firstClick.y - currentClick.y;
                } else{
                    startY = data.firstClick.y;
                    lengthY = currentClick.y - data.firstClick.y;
                }
                
                var rgba = getRandomColor().slice(0, -1);
                rgba = rgba.replace("rgb","rgba");
                rgba += ", 0.7)";
                                                
                data.AOIs.push({
                    index: generateAOIIndex(),
                    startX: toDataX(startX),
                    lengthX: toDataX(lengthX),
                    startY: toDataY(startY),
                    lengthY: toDataY(lengthY),
                    rgba: rgba
                });
                
                listener("UPDATEAOIS");
                
                data.firstClick = null;                
            }
        }
    }
    
    function removeAOI(index){
        data.AOIs.splice(getAOIIndex(index),1);
        listener("UPDATEAOIS");
    }
    
    this.removeAOIs = function(){
        data.AOIs = [];
        listener("UPDATEAOIS");
    }
    
    this.getAOIHTML = function(){
        var HTML = "";
        for(var i = 0; data.AOIs.length > i; i++){
            var aoi = data.AOIs[i];
            HTML +=
                    '<div class="aois inner card-panel hoverable" '+ ///burayi degistiremiyorum, neden inner? 
                    '<div id="animateID-' + (i + 1) + '" class="aois inner card-panel hoverable" ' +
                    'style="left: ' + toRealX(aoi.startX) + '; ' +
                    'top: ' + toRealY(aoi.startY) + '; '+
                    'width: ' + toRealX(aoi.lengthX) + '; '+
                    'height: ' + toRealY(aoi.lengthY) + '; '+
                    'z-index: 3; background-color:' + aoi.rgba + '; " ' + //hangisi onde hangisi arkada olsun diye
                    'data-index="' + aoi.index + '">'+
                    '<h5 class="unselectable center-align">' + aoi.index + '</h5>'+
                    '</div>';
        }  //her bir AOI için div oluşuyor, backgorund color değişiyor
        
        return HTML;
    }

    function getRandomColor(){
        var colors = [
            "red", "pink", "purple", "deep-purple", "indigo", "blue",
            "light-blue", "cyan", "teal", "green", "light-green", "lime",
            "yellow", "amber", "orange", "deep-orange"
        ];
        var tones = [
            "lighten-5", "lighten-4", "lighten-3", "lighten-2", "lighten-1",
            "darken-1", "darken-2", "darken-3", "darken-4",
            "accent-1", "accent-2", "accent-3", "accent-4"
        ];
        
        var color = colors[Math.floor((Math.random() * 16))];
        var tone = tones[Math.floor((Math.random() * 13))];

        $('#map').append('<div id="tempforcolor" class="hidden '+color+' '+tone+'"></div>');
        var rgb = $('#tempforcolor').css("background-color");
        $('#tempforcolor').remove();
        
        return rgb;
    }
    
    this.createDownloadImage = function(stimuliName){
        var backgroundImg = new Image();
        backgroundImg.src = data.categories[findCategoryIndex(stimuliName)].img;
        
        backgroundImg.onload = function () {
            var mapImg = $('#map').find('canvas')[1];

            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext("2d");
            canvas.height = size.dataH;
            canvas.width = size.dataW;

            ctx.drawImage(backgroundImg, 0, 0, size.width, size.height, 0, 0, size.dataW, size.dataH);
            ctx.drawImage(mapImg, 0, 0, mapImg.width, mapImg.height, 0, 0, size.dataW, size.dataH);
            data.download = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            listener('IMGDOWNLOAD');
        }
    };
    
    this.getDownloadImage = function(){
        return data.download;
    };
    
    /* Misc. Module Functions ENDS */
    
    /* Other Modules Functions STARTS */
    
    /* STA Module Functions STARTS */
    this.showSTAMap = function(stimuliName, settings, filter){
        listener("LOADERSTART");
        createVisualMap(createSTAMap(getSTAData(stimuliName,settings,filter)));
        listener("LOADEREND");
    };
    
    this.isSTAMAPApplicable = function(){
        if(data.AOIs.length > 1){
            return true;
        }
        return false;
    };

    function createSTAMap(staSequence) {

        animatedSTAseq = staSequence;

        var areaWeights = new Array();
        var areaNodes = new Array();
        var areaEdges = new vis.DataSet();
        for(var i = 0; data.AOIs.length > i; i++){
            areaWeights[i] = 0;
        }

        for(var i = 0; staSequence.length > i; i++){
            var index = getAOIIndex(parseInt(staSequence[i]));
            areaWeights[index]++;
            if(staSequence.length > i+1){
                var indexNext = getAOIIndex(parseInt(staSequence[i+1]));
                var id = staSequence[i] + "-" + staSequence[i+1];
                var label = areaEdges.get(id);
                if(label == null){
                    label = String(i+1);
                } else{
                    label = label.label + ", " + String(i+1);
                }
                areaEdges.update({id: id, from: index, to: indexNext,
                    label: label, arrows: "to",
                    smooth: {enabled: true, type: "continuous"}
                });
            }
        }

        for(var i = 0; areaWeights.length > i; i++){
            var area = data.AOIs[i];
            if(areaWeights[i] != 0){
                var x = toRealX(area.startX + area.lengthX/2);
                var y = toRealY(area.startY + area.lengthY/2);
                areaNodes.push({id: i, x: x, y: y, value: areaWeights[i], group: i, label: i+1});
            }
        }

        return {nodes: areaNodes, edges: areaEdges.get()};
    };

    function getSTAData(stimuliName, settings, filter){
        var staInputData = new Object();

        for(var i = 0; filter.participants.length > i; i++){
            var participant = filter.participants[i];
            staInputData[participant] = data.main[stimuliName].get({
                filter: function (stimuliInstant) {
                    return stimuliInstant.participantID == participant && filterStimuli(stimuliInstant,filter);
                }
            });
        }

        var postData = {
            areaData: data.AOIs,
            rawData: staInputData,
            settings: settings
        };
        
        var jsondata = JSON.stringify(postData);
        var dataResponse;
        
        $.ajax({
            type: "POST",
            url: staAddress,
            data: {jsondata: jsondata},
            crossDomain: true,
            success: function(response){
                dataResponse = response;
            },
            async: false
        });
        
        return JSON.parse(dataResponse);
    }
    /* STA Module Functions ENDS */
    
    /* Other Modules Functions ENDS */
    
    /* Function Calls  STARTS */
    map.moveTo({
        position: {x: 0, y:0},
        offset: {x: -1*size.width/2, y: -1*size.height/2},
        scale: 1
    });
    
    map.on("click", function (params) {
        if(!data.AOIBlock){
            addAOI(params.pointer.canvas);
        }
    });
    
    $('#map').parent().delegate('.aois','dblclick',function(){
        removeAOI($(this).data("index"));
    });
    
    /* Function Calls ENDS */
    
    // Heatmap generation functions start

     function createHeatmap(stimuliInstant){
         //alert("heatmapInstance öncesi");
         if (heatmapInstanceflag == 0)
         {
             heatmapInstance = h337.create(
                 {
                     container: document.querySelector('.vis-network'),
                 });
         }

        heatdata = heatmapvalues(stimuliInstant);
        heatmapInstance.setData(heatdata);
         
    };
    
    function heatmapvalues(stimuliInstant) {

            //alert("length");
            //alert(heatmapDataPoint.h_x_pos.length);
            //alert(heatmapDataPoint.h_y_pos.length);
            //alert(heatmapDataPoint.h_fix_value.length);
            var hpoints = new Array();
            var maxvalue = 0;
            var width = 1240.17;
            var height = 992.133;

            for (var i = 0; i < heatmapDataPoint.h_x_pos.length; i++) { //length tek dimension olmalı
                
                var pointh = {
                    value: heatmapDataPoint.h_fix_value[i],
                    x: heatmapDataPoint.h_x_pos[i],
                    y: heatmapDataPoint.h_y_pos[i]
                };
                
                maxvalue = Math.max(maxvalue, heatmapDataPoint.h_fix_value[i]);
          
                hpoints.push(pointh);

        }

        var hdata = {
            max: maxvalue,
            data: hpoints
        };

       return hdata;
    }
    
   
    
    this.generateHeatmap = function (stimuliName, filter=null){
        //alert("----");
        //alert(heatmapDataPoint.h_x_pos);
        mapData.nodes.clear();
        mapData.edges.clear();

        listener("LOADERSTART");
        
        if(filter != null && filter.img != null){
            console.log("hello 2");
            fetchBackgroundImage(stimuliName, filter.img);
        } else{
             
            fetchBackgroundImage(stimuliName);
            createHeatmap(stimuliName);
        }

        heatmapInstanceflag = 1;
        //alert("bak:");
        //alert(heatmapDataPoint.h_x_pos[2]);
       
        //listener("LOADEREND");
    };

    
    // Heatmap generation functions end 
    /*  ANIMATED STA MAP Starts */

    this.animatedSTAMap = function (stimuliName, settings, filter) {
        alert("animated function");


        if (animatedSTAseq == null) {
            animatedSTAseq = getSTAData(stimuliName, settings, filter);  // holds STA sequence result in an array
        }//If the user chooses to see the animated sta map directly (without seeing the sta map first), we need to declare the array values here again
        // holds STA sequence result in an array

        // array that holds the AOI block list with all CSS info as a <div>

        for (var i = 0; data.AOIs.length > i; i++) { // AOI blocks are held inside the array by their order of data-index
            animeDiv[i] = document.querySelector("[data-index=" + CSS.escape(i + 1) + "]");
        }
        alert("anime div length is" + animeDiv.length);
        alert("anime div0 is" + animeDiv[0]);

        var staResultBlock = [];
        for (i = 0; i < animatedSTAseq.length; i++) {
            staResultBlock[i] = animatedSTAseq[i];

        }

        animatedSTAMapAnimate(staResultBlock);


        //alert(animatedSTAseq.length);

        //for (i = 0; animatedSTAseq.length > i; i++) {  // loops the STA sequence result
        //alert("girdi");
  // shows me the value (the AOI it refers to inside the animeDiv) of that place of sequence
        //var referredAOIBlock = animeDiv[staResultBlock - 1]; // the


        //var elementID = referredAOIBlock.id;
        //var newElementID = "'#" + elementID + "'";
        //alert(referredAOIBlock);
        //alert(idEl);
        // anime fonksiyonu burada 
        //for (var k = 0; k < 2; k++) {
        //    anime({
        //    targets: animeDiv[k],
        //    translateY: [
        //        { value: 200, duration: 500 },
        //        { value: 0, duration: 500 }
        //        ]
        //    }
        //    );

        //}

    };

    function animatedSTAMapAnimate(n) {

        var tl = anime.timeline({
            easing: 'easeOutExpo',
            duration: 750
        });
        alert("lenth is");
        alert(n.length);
        alert("lenghtenkactim");
        for (i = 0; i < n.length; i++) {
            alert(n[i]);
            tl.add({
                targets: animeDiv[n[i]],
                backgroundColor: '#FFF',
                borderRadius: ['0%', '50%'],
                easing: 'easeInOutQuad',
                opacity: .5
            })
        }
        //tl.add({
        //        targets: animeDiv[0],
        //        backgroundColor: '#FFF',
        //        borderRadius: ['0%', '50%'],
        //        easing: 'easeInOutQuad',
        //        opacity: .5
        //    })
        //    .add({
        //        targets: animeDiv[1],
        //        backgroundColor: '#FFF',
        //        borderRadius: ['0%', '50%'],
        //        easing: 'easeInOutQuad',
        //        opacity: .5
        //    })
        //    .add({
        //        targets: animeDiv[2],
        //        backgroundColor: '#FFF',
        //        borderRadius: ['0%', '50%'],
        //        easing: 'easeInOutQuad',
        //        opacity: .5
        //    });
        //anime.timeline({
        //        targets: animeDiv[n],
        //        translateY: 200,
        //        duration: 1000
        //} 
        //    );


        
        //listener("LOADEREND");
    };
}