const cytoscape = require('cytoscape');
const path = require('path');
const {remote,  ipcRenderer} = require('electron');
const {BrowserWindow, dialog} = remote;
const klawSync = require('klaw-sync');
const fs = require('fs-extra');


document.getElementById('is-rule').addEventListener('click', function(){
    let toggled = (document.getElementById('is-rule').toggled) ? false : true;
    document.getElementById('by-syntax').disabled = toggled;
    document.getElementById('by-terme').disabled = toggled;
    document.getElementById('one-action').disabled = toggled;
    document.getElementById('multi-action').disabled = toggled;
});


document.getElementById('plugin-documentation').addEventListener('click', function(){
    let toggled = (document.getElementById('plugin-documentation').toggled) ? false : true;
    document.getElementById('documentation-name').disabled = toggled;
    document.getElementById('documentation-serveur').disabled = toggled;
});

let pluginImage = path.normalize (__dirname + '/../../images/icons/plugin.png');
let flagrefresh;
let cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: false,
  autounselectify: false,
  zoomingEnabled: false,
  autoungrabify : false,
  userZoomingEnabled: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  pixelRatio: 'auto',
  style: cytoscape.stylesheet()
      .selector('node')
      .css({
        'height': 90,
        'width': 90,
        'size': 90,
        'background-fit': 'cover',
        'border-color': "rgba(226, 45, 17, 1)",
        'border-width': 6,
        'border-opacity': 0
      })
});



function addCY () {

  cy.add(
    { group: "nodes",
      data: { id: 'plugin-img'}
    }
  );

  let s = cy.$('#plugin-img');
  style = {
      'background-image': "url('" + pluginImage+"')"
  };
  s.style(style);
  s.renderedPosition('x', 45);
  s.renderedPosition('y', 45);

  s.on('tap', function(evt){
      ChoosePluginImg();
  });

  s.lock();

}


function ChoosePluginImg () {

  let id = ipcRenderer.sendSync('infos', 'id');
  let win = BrowserWindow.fromId(id);

  let options = {
    title: "Image du Plugin",
    defaultPath: path.normalize (__dirname + '/../../../core/plugins'),
    filters: [
      { name: 'Images',
        extensions: ['png']
      }
    ],
    properties: ['openFile']
  };

  dialog.showOpenDialog(win, options, function (file) {
    if(file && file.length > 0) {
      if (file[0].indexOf(' ') != -1) {
        dialog.showErrorBox('Erreur', "Le nom du fichier ne doit avoir contenir d'espace.");
        return;
      }
      pluginImage = file[0];
      changePluginImg(file[0]);
    }
  });

}


function changePluginImg (img) {

  if (cy) {
      var s = cy.$('#plugin-img')
      style = {
          'background-image': "url('" + img+"')"
      };
      s.style(style);
  }

}


function createplugin () {

  let plugin = document.getElementById('plugin-name').value;
  let pluginLabel = document.getElementById('plugin-label').value;
  let numActions = document.getElementById('multi-action').toggled;
  let intentType = document.getElementById('by-syntax').toggled;
  let isRoom = document.getElementById('room-in-rule').toggled;
  let init = document.getElementById('init-method').toggled;
  let cron = document.getElementById('cron-method').toggled;
  let devMethod = document.getElementById('simple-js').toggled ? "simple" : document.getElementById('middle-js').toggled ? "middle" : "expert";

  // check si il existe déjà
  if (isExists(plugin)) {
    dialog.showErrorBox('Erreur', "Le plugin "+plugin+" existe déjà dans la bibliothèque de plugins. Modifiez son nom.");
    return;
  }
  // check si le nom de la doc est null
  if (document.getElementById('plugin-documentation').toggled && document.getElementById('documentation-name').value == '') {
    dialog.showErrorBox('Erreur', "Le nom du fichier HTML pour la page de démarrage de la documentation est manquant !");
    return;
  }
  // check si le nom de la doc n'est pas .html
  if (document.getElementById('plugin-documentation').toggled && document.getElementById('documentation-name').value == '' && ((document.getElementById('documentation-name').value).toLowerCase()).indexOf('.html') == -1) {
    dialog.showErrorBox('Erreur', "Le nom du fichier HTML pour la page de démarrage est incorrect !");
    return;
  }

  // Création du répertoire
 let pluginDir = path.normalize (__dirname + '/../../../core/plugins/'+plugin+'/assets/images');
 fs.ensureDirSync(pluginDir);

 // Creation du fichier Intent & action
 if (document.getElementById('is-rule').toggled) {
   createIntent(plugin, intentType, numActions);
   createAction(plugin, isRoom, intentType, numActions);
 } else {
   intentType = null;
   numActions = null;
 }
 // Creation du properties
 createProp(plugin, pluginLabel, intentType, numActions, isRoom, cron);
 // Js
 createJS(plugin, isRoom, init, cron, numActions, devMethod);

 if (document.getElementById('plugin-documentation').toggled) {
    let docName = document.getElementById('documentation-name').value;
    let isServeur = document.getElementById('documentation-serveur').toggled;
    createDocumentation(plugin, docName, isServeur);
  }

  if (pluginImage != path.normalize (__dirname + '/../../images/icons/plugin.png'))
    addImage(plugin);

  addMarkuDownInfo(plugin, pluginLabel, intentType, numActions, isRoom, cron);

 // Restart
 ipcRenderer.sendSync('infos', 'quit');

}



function addInfoCreation() {

  let plugin = document.getElementById('plugin-name').value;
  let pluginLabel = document.getElementById('plugin-label').value;
  let isDoc = document.getElementById('plugin-documentation').toggled;
  let numActions = document.getElementById('multi-action').toggled;
  let intentType = document.getElementById('by-syntax').toggled;
  let isRoom = document.getElementById('room-in-rule').toggled;
  let init = document.getElementById('init-method').toggled;
  let cron = document.getElementById('cron-method').toggled;
  let devMethod = document.getElementById('simple-js').toggled ? "Basique" : document.getElementById('middle-js').toggled ? "ECMAScript 5" : "ECMAScript 6";
  let docName = document.getElementById('documentation-name').value;
  let isServeur = document.getElementById('documentation-serveur').toggled;

  let xTab = document.getElementById("tab-result");

  if (!document.getElementById("x-name")) {
      let xname = document.createElement("x-label");
      xname.setAttribute('id', 'x-name');
      xname.className = 'x-label-size label-xbottom marge';
      let textname = document.createTextNode("- Nom du plugin: " + plugin);
      xname.appendChild(textname);
      xTab.appendChild(xname);

      let xlabel = document.createElement("x-label");
      xlabel.setAttribute('id', 'x-label');
      xlabel.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xlabel);

      let xactions = document.createElement("x-label");
      xactions.setAttribute('id', 'x-actions');
      xactions.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xactions);

      let xintent = document.createElement("x-label");
      xintent.setAttribute('id', 'x-intent');
      xintent.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xintent);

      let xroom = document.createElement("x-label");
      xroom.setAttribute('id', 'x-room');
      xroom.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xroom);

      let xinit = document.createElement("x-label");
      xinit.setAttribute('id', 'x-init');
      xinit.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xinit);

      let xcron = document.createElement("x-label");
      xcron.setAttribute('id', 'x-cron');
      xcron.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xcron);

      let xdev = document.createElement("x-label");
      xdev.setAttribute('id', 'x-dev');
      xdev.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xdev);

      let ximage = document.createElement("x-label");
      ximage.setAttribute('id', 'x-image');
      ximage.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(ximage);

      let xdoc = document.createElement("x-label");
      xdoc.setAttribute('id', 'x-doc');
      xdoc.className = 'x-label-size label-xbottom marge';
      xTab.appendChild(xdoc);

      let xdocName = document.createElement("x-label");
      xdocName.setAttribute('id', 'x-docName');
      xdocName.className = 'x-label-size label-xbottom doublemarge';
      xTab.appendChild(xdocName);

      let docServeur = document.createElement("x-label");
      docServeur.setAttribute('id', 'x-docServeur');
      docServeur.className = 'x-label-size label-xbottom doublemarge';
      xTab.appendChild(docServeur);

      let lastInfo = document.createElement("x-label");
      lastInfo.setAttribute('id', 'x-lastInfo');
      lastInfo.className = 'label-info-action label-top label-bottom';
      xTab.appendChild(lastInfo);

  }

  document.getElementById("x-name").innerHTML = "- Nom du plugin: <b>"+plugin+"</b>";
  document.getElementById("x-label").innerHTML = "- Label du plugin: <b>" + ((pluginLabel && pluginLabel.length > 0) ? pluginLabel +"</b>" : plugin +"</b>");
  document.getElementById('x-actions').innerHTML = (document.getElementById('is-rule').toggled)
          ?  "- Nombre d'actions : <b>" + ((numActions) ? "Plusieurs</b>": "Une seule</b>")
          :  "- <b>Pas de gestion des règles vocales</b>";
  document.getElementById('x-intent').innerHTML = (document.getElementById('is-rule').toggled)
          ?  "- Fichier d'intention : <b>Par " + ((intentType) ? "la syntaxe de la phrase</b>": "un terme dans la phrase</b>")
          :  "- <b>Pas de gestion des règles vocales</b>";
  document.getElementById("x-room").innerHTML = "- Un nom de pièce est possible dans la règle : <b>" + ((isRoom) ? "Oui</b>": "Non</b>");
  document.getElementById("x-init").innerHTML = "- Le Script JS contient une méthode init: <b>" + ((init) ? "Oui</b>": "Non</b>");
  document.getElementById("x-cron").innerHTML = "- Le Script JS contient une méthode cron: <b>" + ((cron) ? "Oui</b>": "Non</b>");
  document.getElementById("x-dev").innerHTML = "- Développement: <b>" + devMethod+"</b>";
  document.getElementById("x-image").innerHTML = "- Fichier image: <b>" + ((pluginImage != path.normalize (__dirname + '/../../images/icons/plugin.png')) ? "Oui</b>" : "Par défaut</b>");
  document.getElementById("x-doc").innerHTML = "- Le plugin a une documentation HTML: <b>" + ((isDoc) ? "Oui</b>": "Non</b>");
  if (isDoc && (!docName || docName.length == 0))
    docName = "[Fichier de démarrage manquant !]";
  document.getElementById("x-docName").innerHTML = "- Nom du fichier de démarrage: <b>" + ((isDoc) ? docName +"</b>" : "Aucun</b>");
  document.getElementById("x-docServeur").innerHTML = "- Serveur de documentation: <b>" + ((isDoc) ? (isServeur) ? "Oui</b>": "Non</b>" : "Aucun</b>");

  document.getElementById("x-lastInfo").innerHTML = "<b>Note:</b> Retrouvez d'autres informations sur la création de ce plugin dans sa page d'informations."
}


function addImage (plugin) {

  let newFile = path.normalize (__dirname+ '/../../../core/plugins/'+plugin+'/assets/images/'+plugin+'.png');
  if (pluginImage != newFile)
    fs.copySync(pluginImage, newFile);
}


function createDocumentation(plugin, docName, isServeur) {

  let docDir = path.normalize (__dirname + '/../../../core/plugins/'+plugin+'/documentation');
  fs.ensureDirSync(docDir);

  let init = '{\n"static": '+(isServeur ? 'true':'false')+',\n"start": "'+docName+'"\n}';
  fs.writeFileSync (path.normalize (__dirname +'/../../../core/plugins/'+plugin+'/documentation/documentation.ini', init, 'utf8'));
}



function addMarkuDownInfo(plugin, label, type, numActions, isRoom, cron) {

  let fileName;
  if (type != null) {
     fileName = (type == true) ? 'syntax' : 'terme';
     fileName += (numActions == true) ? '_multiactions' : '_monoaction';
  } else {
    fileName = 'noaction';
  }
  fileName += (isRoom) ? '_rooms' : '_norooms';
  fileName += (cron) ? '_cron' : '_nocron';
  fileName += '.md';

  let md = fs.readFileSync('./resources/app/lib/create_modules/info/'+fileName, 'utf8');
  md = md.replace(/label_module/g, ((label && label.length > 0) ? label : plugin));

  fs.writeFileSync ('./resources/core/plugins/'+plugin+'/assets/infos.md', md, 'utf8');
}




function createJS(plugin, isRoom, init, cron, numActions, devMethod) {
  let fileName;
  if (numActions != null) {
    fileName = devMethod;
    fileName += (numActions) ? '_multiactions' : '_monoaction';
  } else {
    fileName = "noaction";
  }
  fileName += (isRoom) ? '_rooms' : '_norooms';
  fileName += (init) ? '_init' : '_noinit';
  fileName += (cron) ? '_cron' : '_nocron';
  fileName += '.js';

  let js = fs.readFileSync('./resources/app/lib/create_modules/js/'+fileName, 'utf8');
  js = js.replace(/create_module/g, plugin);

  fs.writeFileSync ('./resources/core/plugins/'+plugin+'/'+plugin+'.js', js, 'utf8');

}


function createProp(plugin, label, type, numActions, isRoom, cron) {
  let fileName;
  if (type != null) {
    fileName = (type) ? 'syntax' : 'terme';
    fileName += (numActions) ? '_multiactions' : '_monoaction';
  } else {
    fileName = 'noaction';
  }
  fileName += (isRoom) ? '_rooms' : '_norooms';
  fileName += (cron) ? '_cron' : '_nocron';
  fileName += '.prop';

  let prop = fs.readFileSync('./resources/app/lib/create_modules/properties/'+fileName, 'utf8');
  prop = prop.replace(/create_module/g, plugin);
  prop = prop.replace(/label_module/g, ((label && label.length > 0) ? label : plugin));

  fs.writeFileSync ('./resources/core/plugins/'+plugin+'/'+plugin+'.prop', prop, 'utf8');
}


function createAction (plugin, isRoom, type, numActions) {

  let actionFile = type ? './resources/app/lib/create_modules/action/syntax'
                        : './resources/app/lib/create_modules/action/terme';
  actionFile += numActions ? '.multiactions.js' : '.monoaction.js'

  let action = fs.readFileSync(actionFile, 'utf8');
  action = action.replace(/create_module/g, plugin);

  if (isRoom)  {
    action = action.replace("// let room = Avatar.ia.clientFromRule (state.rawSentence, state.client);", "let room = Avatar.ia.clientFromRule (state.rawSentence, state.client);");
    action = action.replace("//room: room, //décommentez si vous initialisez la variable room", "room: room,");
  }

  fs.writeFileSync ('./resources/core/plugins/'+plugin+'/action.'+plugin+'.js', action, 'utf8');

}


function createIntent(plugin, type, numActions) {

  let intentFile = type ? './resources/app/lib/create_modules/intent/syntax'
                        : './resources/app/lib/create_modules/intent/terme';
  intentFile += numActions ? '.multiactions.js' : '.monoaction.js'

  let intent = fs.readFileSync(intentFile, 'utf8');

  intent = intent.replace(/create_module/g, plugin);
  fs.writeFileSync ('./resources/core/plugins/'+plugin+'/intent.'+plugin+'.js', intent, 'utf8');

}


function isExists (name) {

    let pluginDirs = klawSync('./resources/core/plugins', {nofile: true, depthLimit: 1});

    for (plugin in pluginDirs) {
      if ((pluginDirs[plugin].path.substring(pluginDirs[plugin].path.lastIndexOf("\\") + 1)).toLowerCase() == name.toLowerCase())
        return true;
    }

    return false;
}


var doneButton = document.getElementById('submit');
doneButton.addEventListener('click', function(){
     createplugin();
});


$(document).ready(function() {
    var current_fs, next_fs, previous_fs;
    var left, opacity, scale;
    var animating;

    addCY();

    $(".steps").validate({
        errorClass: 'invalid',
        errorElement: 'span',
        errorPlacement: function(error, element) {
            error.insertAfter(element.next('span').children());
        },
        highlight: function(element) {
            $(element).next('span').show();
        },
        unhighlight: function(element) {
            $(element).next('span').hide();
        }
    });
    $(".next").click(function() {
        $(".steps").validate({
            errorClass: 'invalid',
            errorElement: 'span',
            errorPlacement: function(error, element) {
                error.insertAfter(element.next('span').children());
            },
            highlight: function(element) {
                $(element).next('span').show();
            },
            unhighlight: function(element) {
                $(element).next('span').hide();
            }
        });
        if ((!$('.steps').valid())) {
            return true;
        }
        if (animating) return false;
        animating = true;
        current_fs = $(this).parent();
        next_fs = $(this).parent().next();
        $("#progressbar li").eq($("fieldset").index(next_fs)).addClass("active");
        next_fs.show();
        current_fs.animate({
            opacity: 0
        }, {
            step: function(now, mx) {
                scale = 1 - (1 - now) * 0.2;
                left = (now * 50) + "%";
                opacity = 1 - now;
                current_fs.css({
                    'transform': 'scale(' + scale + ')'
                });
                next_fs.css({
                    'left': left,
                    'opacity': opacity
                });
            },
            duration: 800,
            complete: function() {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutExpo'
        });

        if ($("fieldset").index(next_fs) == 4 && !flagrefresh){
          //flagrefresh = true;
          window.resizeTo(window.outerWidth - 1, window.outerHeight);
        }

        if ($("fieldset").index(next_fs) == 5){
          addInfoCreation();
        }
    });
    $(".previous").click(function() {
        if (animating) return false;
        animating = true;
        current_fs = $(this).parent();
        previous_fs = $(this).parent().prev();
        $("#progressbar li").eq($("fieldset").index(current_fs)).removeClass("active");
        previous_fs.show();
        current_fs.animate({
            opacity: 0
        }, {
            step: function(now, mx) {
                scale = 0.8 + (1 - now) * 0.2;
                left = ((1 - now) * 50) + "%";
                opacity = 1 - now;
                current_fs.css({
                    'left': left
                });
                previous_fs.css({
                    'transform': 'scale(' + scale + ')',
                    'opacity': opacity
                });
            },
            duration: 800,
            complete: function() {
                current_fs.hide();
                animating = false;
            },
            easing: 'easeInOutExpo'
        });
    });
});


var modules = {
    $window: $(window),
    $html: $('html'),
    $body: $('body'),
    $container: $('.container'),
    init: function() {
        $(function() {
            modules.modals.init();
        });
    },
    modals: {
        trigger: $('.explanation'),
        modal: $('.modal'),
        scrollTopPosition: null,
        init: function() {
            var self = this;
            if (self.trigger.length > 0 && self.modal.length > 0) {
                modules.$body.append('<div class="modal-overlay"></div>');
                self.triggers();
            }
        },
        triggers: function() {
            var self = this;
            self.trigger.on('click', function(e) {
                e.preventDefault();
                var $trigger = $(this);
                self.openModal($trigger, $trigger.data('modalId'));
            });
            $('.modal-overlay').on('click', function(e) {
                e.preventDefault();
                self.closeModal();
            });
            modules.$body.on('keydown', function(e) {
                if (e.keyCode === 27) {
                    self.closeModal();
                }
            });
            $('.modal-close').on('click', function(e) {
                e.preventDefault();
                self.closeModal();
            });
        },
        openModal: function(_trigger, _modalId) {
            var self = this,
                scrollTopPosition = modules.$window.scrollTop(),
                $targetModal = $('#' + _modalId);
            self.scrollTopPosition = scrollTopPosition;
            modules.$html.addClass('modal-show').attr('data-modal-effect', $targetModal.data('modal-effect'));
            $targetModal.addClass('modal-show');
            modules.$container.scrollTop(scrollTopPosition);
        },
        closeModal: function() {
            var self = this;
            $('.modal-show').removeClass('modal-show');
            modules.$html.removeClass('modal-show').removeAttr('data-modal-effect');
            modules.$window.scrollTop(self.scrollTopPosition);
        }
    }
}
modules.init();
