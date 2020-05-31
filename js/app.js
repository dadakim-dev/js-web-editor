filePath = "/";
images = [];
lock = false;
tabs = [];

$(function() {
    connect();
    
    on(".rootBtn", "click", function() {
        if(lock == true) return false;
        
        filePath = "/";
        loadEntry(filePath);
    });
    
    on(".btn-wrap > .btn", "click", function() {
        if(lock == true) return false;
        
        var id = $(this).attr("data-popup");
        onShowPopup(id);
    });
    
    on(".fileList > li:not(.title)", "dblclick", function() {
        var path = $(this).attr("data-path");
        
        fs.root.getFile(path, {}, function(fileEntry) {
            if(getExt(fileEntry.name).match(/(jpg|jpeg|png|gif)/)) viewFile(fileEntry);
            else editFile(fileEntry);
        }, onError);  
    });
    
    on(".folderList > li:not(.title)", "dblclick", function() {
        var path = $(this).attr("data-path");
        filePath = path;
        loadEntry(path);
    });
    
    on(".editorPreview", "click", function() {
        var path = $(".editor-tab .this").attr("data-path");
        
        fs.root.getFile(path, {}, function(fileEntry) {
            viewFile(fileEntry);
        }, onError);
    });
    
    on(".editorSave", "click", function() {
        var path = $(".editor-tab .this").attr("data-path");
        
        fs.root.getFile(path, {}, function(fileEntry) {
            var contents = $(".editor-window .this").val();
            saveFile(fileEntry, contents);
        }, onError);
    });
    
    on(".addFolder", "click", function() {
        var name = $("#folderName").val();
        if(nameCheck(name) == true) createFolder(filePath, name);
    });
    
    on(".popup-close", "click", function() {
        var id = "#" + $(this).parents(".popup").attr("id");
        onHidePopup(id);
    });
    
    on(".addFile", "click", function() {
        var path = $("#fileName").val() + "." + $("#fileExt").val();
        path = clearPath(filePath+"/"+path);
        if(nameCheck($("#fileName").val()) == true) createFile(path);
    });
    
    on("#imageName", "change", function() {
        var file = this.files;
        readImage(file);
    });
    
    on("#imageBox", "drop drag dragover dragleave", function(e) { e.preventDefault(); });
    
    on("#imageBox", "drop", function(e) {
        var file = e.originalEvent.dataTransfer.files;
        readImage(file);
    });
    
    on(".saveImg", "click", function() {
        lock = true;
        var file = images;
        saveImage(file);
        onHidePopup("#popup-image");
    });
    
    $(window).on("keydown", function(e) {
        if(e.ctrlKey && e.which == 83) {
            e.preventDefault();
            $(".editorSave").click();
        }
        
        if(e.which == 9) {
            e.preventDefault();
            insertTab();
        }
        
        if(e.ctrlKey && e.which == 88) {
            e.preventDefault();
            e.stopPropagation();
            
            var idx = $(".editor-tab > div.this").attr("data-openIdx");
            closeTab(idx);
        }
    });
    
    on(".fileList > li:not(.title)", "contextmenu", function(e) {
        showContextMenu(this, e);
    });
    
    on(".folderList > li:not(.title)", "contextmenu", function(e) {
        showContextMenu(this, e);
    });
    
    $(window).on("mousedown", function(e) {
        var target = e.target;
        var exist = $(".contextMenu");
        if(!$(target).hasClass("menu-context") && exist.length > 0) hideContextMenu();
    });
    
    on(".contextMenu", "click", function(e) {
        e.stopPropagation();
        
        var path = $(this).parents("li").attr("data-path");
        if($(this).parents("ul").hasClass("fileList")) {
            removeFile(path);
        } else {
            removeFolder(path);
        }
    });
    
    on(".editor-tab > div", "click", function() {
        var idx = $(this).attr("data-openIdx");
        
        $(".editor-tab > div").removeClass("this");
        $(".editor-window > textarea").removeClass("this");
        
        $(".editor-tab > div").eq(idx).addClass("this");
        $(".editor-window > textarea").eq(idx).addClass("this");
    });
    
    on(".editor-tab .editor-close", "click", function(e) {
        e.stopPropagation();
        var idx = $(this).parents("div").attr("data-openIdx");
        closeTab(idx);
    });
    
    on(".dirPath > .path > .text", "click", function() {
        var path = $(this).parents(".path").attr("data-path");
        filePath = path;
        loadEntry(path);
    });
    
    window.onunload = function() {
        tabs = [];
        
        $(".editor-tab > div").each(function(e, el) {
            tabs.push($(el).attr("data-path"));
        });
        
        localStorage.setItem("path", filePath);
        localStorage.setItem("tabs", JSON.stringify(tabs));
    }
});

function loadPrevious() {
    var localPath = localStorage.getItem("path");
    var localTabs = localStorage.getItem("tabs");
    
    if(localPath != null && localPath != "" && localPath != undefined) {
        filePath = localPath;
    }
    
    if(localTabs != null && localTabs != "" && localTabs != undefined) {
        tabs = JSON.parse(localTabs);
    }
    
    $(tabs).each(function(e, el) {
        fs.root.getFile(el, {}, function(fileEntry) {
            fileEntry.file(function(file) {
                var reader = new FileReader();
                reader.readAsText(file);
                reader.onloadend = function(e) {
                    var contents = e.target.result;
                    openFile(el, fileEntry.name, contents);
                }
            });
        });
    });
}

function nameCheck(name) {
    var returnValue = true;
    if(name.match(/^\./) != null) returnValue = false;
    if(name == "") returnValue = false;
    
    var temp = false;
    for(var i=0; i<name.length - 1; i++) {
        var str = name.substr(i, 1);
        if(str != " ") temp = true;
    }
    
    if(returnValue == false || temp == false) {
        returnValue = false;
        alert("폴더나 파일 생성 시 이름은 '.'으로 시작할 수 없고, 공백이어선 안됩니다. 확인 후 다시 생성 바랍니다.");
    }
    
    return returnValue;
}

function closeTab(idx) {
    var path = $(".editor-tab > div").eq(idx).attr("data-path");
    
    function close() {
        $(".editor-tab > div").eq(idx).remove();
        $(".editor-window > textarea").eq(idx).remove();

        $(".editor-tab > div:last-child").addClass("this");
        $(".editor-window > textarea:last-child").addClass("this");

        setOpenIdx();
    }
    
    fs.root.getFile(path, {}, function(fileEntry) {
        fileEntry.file(function(file) {
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(e) {
                var contents = $(".editor-window > textarea").eq(idx).val(); 
                if(contents != e.target.result) {
                    if(confirm("현재 편집중인 파일이 저장되어 있지 않습니다. 파일을 닫을 시 내용이 손실될 수 있습니다. 저장하시겠습니까?") == true) {
                        saveFile(fileEntry, contents);
                        setTimeout(close, 1000);
                    } else {
                        close();
                    }
                } else {
                    close();
                }
            }
        }, onError);
    }, function() {
        close();
    });
}

function insertTab() {
    var text = $("textarea.this");
    var start = $(text).get(0).selectionStart;
    var end = $(text).get(0).selectionEnd;
    
    if(start == end) {
        $(text).val($(text).val().substring(0, start)+"\t"+$(text).val().substring(end));

        $(text).get(0).selectionStart = $(text).get(0).selectionEnd = start + 1;
    } else {
        var temp = $(text).val().split("\n");
        var s = 0;
        var contents = [];
        var exclusive = false;
        var pos = {start:start + 1, end:end};
        $(temp).each(function(e, el) {
            if(start >= s && start <= s + el.length) exclusive = true;
            
            if(exclusive == true) {
                contents.push("\t"+el);
                pos.end += 1;
            } else contents.push(el);
            
            if(end >= s && end <= s + el.length) exclusive = false;
            s += el.length;
        });
        
        $(text).val(contents.join("\n"));
        $(text).get(0).selectionStart = pos.start;
        $(text).get(0).selectionEnd = pos.end;
    }
}

function createFile(path) {
    fs.root.getFile(path, {
        create: true,
        exclusive: true
    }, function(fileEntry) {
        onHidePopup("#popup-file");
        message("파일 생성중...", 1000, function() {
            loadEntry(filePath);
        });
    }, function() {
        alert("이미 현재 디렉토리에 같은 이름의 파일이 존재합니다.");
    });
}

function hideContextMenu() {
    $(".contextMenu").animate({
        "opacity": 0,
        "right": "-80px"
    }, 200, function() {
        $(this).remove();
    });
}

function removeFile(path) {
    path = clearPath(path);
    fs.root.getFile(path, {}, function(fileEntry) {
        fileEntry.remove(function() {
            hideContextMenu();
            message("파일 삭제중...", 1000, function() {
                loadEntry(filePath);
                var idx = $(".editor-tab > div[data-path='"+path+"']").attr("data-openIdx");
                closeTab(idx);
            });
        }, onError);
    }, onError);
}

function removeFolder(path) {
    path = clearPath(path);
    fs.root.getDirectory(path, {}, function(dirEntry) {
        dirEntry.removeRecursively(function() {
            hideContextMenu();
            message("폴더 삭제중...", 1000, function() {
                loadEntry(filePath);
                
                var regex = new RegExp("^"+dirEntry.fullPath);
                      
                $(".editor-tab > div").each(function(e, el) {
                    var path = $(el).attr("data-path");
                    if(path.match(regex) != null) {
                        $(this).remove();
                        $(".editor-window > textarea").eq($(this).index()).remove();
                        setOpenIdx();
                    }
                });
            });
        }, onError);
    });
}

function showContextMenu(el, event) {
    event.preventDefault();
    
    var temp = $(".contextMenu");
    if(temp.length > 0) hideContextMenu();
    var contextMenu = "";
    contextMenu += "<div class='contextMenu menu-context'>";
    contextMenu += "<p class='menu-context'>Delete!</p>";
    contextMenu += "</div>";

    $(el).append(contextMenu);

    $(".contextMenu").animate({
        "opacity": 1,
        "right": "-100px"
    }, 200);
    
    $(".contextMenu").focus();
}

function saveImage(file) {
    fs.root.getDirectory(filePath, {}, function(dirEntry) {
        $(file).each(function(e, el) {
            dirEntry.getFile(el.name, {
                create: true,
                exclusive: true
            }, function(fileEntry) {
                fileEntry.createWriter(function(writer) {
                    writer.write(el);
                }, onError);
            }, onError);

            if(e == file.length - 1) {
                message("이미지 저장중...", 1000, function() {
                    loadEntry(filePath.split("/"));
                    lock = false;
                    alert("업로드가 완료되었습니다.");
                });
            }
        });
    }, onError);
}

function readImage(file) {
    var already = [];
    var path = filePath;
    fs.root.getDirectory(path, {}, function(dirEntry) {
        var reader = dirEntry.createReader();
        reader.readEntries(function(result) {
            $(result).each(function(e, el) {
                if(getExt(el.name).match(/(jpg|jpeg|gif|png)/)) already.push(el.name);
            });
            
            $(".imageList > li").each(function(e, el) {
                var text = $(el).text();
                already.push(text);
            });
            
            $(file).each(function(e, el) {
                if(already.indexOf(el.name) != -1) return;
                if(el.type.match(/^image/) == null) return;
                
                var reader = new FileReader();
                reader.onloadend = function(e) {
                    var arr = (new Uint8Array(e.target.result)).subarray(0,4);
                    var header = "";
                    for(var i =0; i<arr.length; i++) {
                        header += arr[i].toString(16);
                    }
                    
                    if(header.match(/(89504e47|47494638|ffd8ffe0|ffd8ffe1|ffd8ffe2)/) == null) return;
                    $(".imageList").append("<li>"+el.name+"</li>");
                    images.push(el);
                }
                reader.readAsArrayBuffer(el);
            });
        }, onError);
    }, onError);
}

function createFolder(path, name) {
    path = clearPath(path+"/"+name);
    
    fs.root.getDirectory(path, {
        create: true,
        exclusive: true
    }, function(dirEntry) {
        onHidePopup("#popup-folder");
        message("폴더 생성중...", 1000, function() { loadEntry(filePath); });
    }, function() {
        alert("이미 현재 디렉토리에 같은 이름의 폴더가 존재합니다.");
    });
}

function onHidePopup(id) {
	$(".popup-background").fadeOut();
	$(id).fadeOut();

    $(".popup input").val("");
    $(".popup select").val("html");
    $(".imageList").html("");
    images = [];
}

function saveFile(fileEntry, contents) {
    fileEntry.createWriter(function(writer) {
        writer.truncate(0);
        writer.onwriteend = function() {
            if(writer.length === 0) {
                var blob = new Blob([contents], {type: "text/"+getExt(fileEntry.name)});
                writer.write(blob);

                message("파일 저장중...", 1000, null);
            }
        }
    }, onError);
}

function message(msg, delay, func) {
    $(".loading > p").text(msg);
    $(".loading").fadeIn(200);
    setTimeout(function() {
        $(".loading").fadeOut(200);
        if(func != null) func();
    }, delay);
}

function viewFile(fileEntry) {
    var url = fileEntry.toURL();
    window.open(url);
}

function editFile(fileEntry) {
    fileEntry.file(function(file) {
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function(e) {
            openFile(fileEntry.fullPath, file.name, e.target.result);
        }
    });
}

function openFile(path, name, contents) {
    if($(".editor-tab > div[data-path='"+path+"']").length > 0) {
        $(".editor-tab > div[data-path='"+path+"']").click();
        return false;
    }
    
    if($(".editor-tab > div").length > 7) {
        alert("탭은 최대 8개까지 열 수 있습니다.");
        return false;
    }
    
    var tab = "";
    tab += '<div data-path="'+path+'">';
    tab += '<span class="editor-text">'+name+'</span>';
    tab += '<span class="editor-close">&times;</span>';
    tab += '</div>';

    var textArea = document.createElement("textarea");
    $(textArea).val(contents);
    
    $(".editor-tab").append(tab);
    $(".editor-window").append(textArea);
    
    $(".editor-tab > div").removeClass("this");
    $(".editor-window > textarea").removeClass("this");
    
    $(".editor-tab > div:last-child").addClass("this");
    $(".editor-window > textarea:last-child").addClass("this");
    
    setOpenIdx();
}

function setOpenIdx() {
    $(".editor-tab > div").each(function(e, el) {
        $(el).attr("data-openIdx", e);
        $(".editor-window > textarea").eq(e).attr("data-openIdx", e);
    });
}

function getExt(name) {
    name = name.split(".");
    name.reverse();
    
    return name[0];
}

function onShowPopup(id) {
    if(filePath == "") filePath = "/";
    
	$(".popup > div:nth-child(2) > input").val(filePath);
	$(".popup-background").fadeIn();
	$(id).fadeIn();
}

function on(selector, event, func) {
    $("body").on(event, selector, func);
}

function onError() {
    console.error("Error!");
}

function onSuccess() {
    console.log("Success!");
}

function connect() {
    navigator.webkitPersistentStorage.requestQuota(5*1024*1024, function(grantedBytes) {
        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
        
        window.requestFileSystem(window.PERSISTENT, grantedBytes, function(fileSystem) {
            fs = fileSystem;
            loadPrevious();
            loadEntry(filePath.split("/"));
        }, onError);
    }, onError);
}

function listPath(path) {
    if(typeof(path) == "string") {
        path = path.split("/");
    }
    
    var div = "";
    var paths = "/";
    
    $(path).each(function(e, el) {
        if(el.trim() == "") return;
        
        div += '<div class="path" data-path="'+(paths+el)+'">';
        div += '<div class="text prev">'+el+'</div>';
        if(e < path.length - 1) div += '<div class="right-btn"><svg><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg></div>';
        div += '</div>';
        
        paths += (el + "/");
    });
    
    $(".dirPath").html(div);
}

function loadEntry(path) {
    path = clearPath(path);
    
    fs.root.getDirectory(path, {}, function(dirEntry) {
        var reader = dirEntry.createReader();
        reader.readEntries(function(result) {
            $(".folderList").html("<li class='title'>폴더</li>");
            $(".fileList").html("<li class='title'>파일</li>");

            if(filePath != "/" && filePath != "") {
                var temp = path.split("/");
                temp.pop();
                $(".folderList").append(returnFolderHTML(clearPath(temp), ".."));
            }

            $(result).each(function(e, el) {
                if(el.isFile == true) $(".fileList").append(returnFileHTML(el.fullPath, el.name));
                else $(".folderList").append(returnFolderHTML(el.fullPath, el.name));
            });

            setDefault();
            listPath(path);
        }, onError);
    }, onError);
}

function returnFolderHTML(path, name) {
    var li = "";
	li += '<li data-path="'+path+'">';
    li += '<span>';
    li += '<svg><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path></svg>';
    li += '</span>';
    li += '<a href="#">'+name+'</a>';
    li += '</li>';
    
    return li;
}

function returnFileHTML(path, name) {
    var li = "";
    li += '<li data-path="'+path+'">';
    li += '<span>';
    li += '<svg><path d="M12,0H4C2.896,0,2.01,0.896,2.01,2L2,18c0,1.104,0.886,2,1.99,2H16c1.104,0,2-0.896,2-2V6L12,0z M11,4H11  z M11,7V1.5L16.5,7H11z"></path></svg>';
    li += '</span>';
    li += '<a href="#">'+name+'</a>';
    li += '</li>';
    
    return li;
}

function setDefault() {
    $(".fileList > li:not(.title)").draggable({
        helper: "clone",
        start: function(event, ui) {
            $(ui.helper).animate({
                "opacity": 0.5
            }, 200);
        },
        stop: function(event, ui) {
            $(".folderList > li:not(.title)").animate({
                "backgroundColor": "white"
            }, 200);
        }
    });
    
    $(".folderList > li:not(.title)").droppable({
        drop: function(event, ui) {
            var target = $(ui.draggable).attr("data-path");
            var to = $(event.target).attr("data-path");
            
            if($(ui.draggable).parents("ul").hasClass("fileList")) moveFile(target, to);
            else moveDirectory(target, to);
        },
        over: function(event, ui) {
            $(event.target).animate({
                "backgroundColor": "#ffce00"
            }, 200);
        },
        out: function(event, ui) {
            $(event.target).animate({
                "backgroundColor": "white"
            }, 200);
        }
    });
    
    $(".folderList > li:not(.title)").draggable({
        helper: "clone",
        start: function(event, ui) {
            $(ui.helper).animate({
                "opacity": 0.5
            }, 200);
        },
        stop: function(event, ui) {
            $(".folderList > li:not(.title)").animate({
                "backgroundColor": "white"
            }, 200);
        }
    });
}

function moveDirectory(target, to) {
    fs.root.getDirectory(to, {}, function(dirEntry) {
		var reader = dirEntry.createReader();
		reader.readEntries(function(result) {
			var temp = [];
			$(result).each(function(e, el) {
				if(el.isFile == false) temp.push(el.name);
			});
			
			fs.root.getDirectory(target, {}, function(dirEntry2) {
				if(temp.indexOf(dirEntry2.name) != -1) {
            		alert("이미 같은 이름의 폴더가 존재하므로 이동할 수 없습니다.");
				} else {
					var changePath = clearPath(dirEntry.fullPath+"/"+dirEntry2.name);
					var regex = new RegExp("^"+target);

					$(".editor-tab > div").each(function(e, el) {
						var path = $(el).attr("data-path");
						path = path.replace(regex, changePath);
						$(el).attr("data-path", path);
					});

					dirEntry2.moveTo(dirEntry);
					message("폴더 이동중...", 1000, function() {
						loadEntry(filePath);
					});
				}
			});
		});
    });
}

function moveFile(target, to) {
	fs.root.getDirectory(to, {}, function(dirEntry) {
		var reader = dirEntry.createReader();
		reader.readEntries(function(result) {
			var temp = [];
			$(result).each(function(e, el) { if(el.isFile == true) temp.push(el.name); });
			fs.root.getFile(target, {}, function(fileEntry) {
				if(temp.indexOf(fileEntry.name) != -1) {
					alert("이미 같은 이름의 파일이 존재하므로 이동할 수 없습니다.");
				} else {
					fileEntry.moveTo(dirEntry);
					var changePath = clearPath(dirEntry.fullPath+"/"+fileEntry.name);
					$(".editor-tab > div[data-path='"+target+"']").attr("data-path", changePath);
					message("파일 이동중...", 1000, function() {
						loadEntry(filePath);
					});
				}
			});
		}, function() {
			onError("Error: reader.readEntries");
		});
	}, function() {
		onError("Error: fs.root.getDirectory");
	});
}

function clearPath(path) {
    if(typeof(path) == "string") {
        path = path.split("/");
    }
    
    var returnValue = [];
    
    $(path).each(function(e, el) {
        if(el == "" || el == ".") return;
        returnValue.push(el);
    });
    
    return "/"+returnValue.join("/");
}