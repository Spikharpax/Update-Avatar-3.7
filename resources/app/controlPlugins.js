const {remote, ipcRenderer} = require('electron');
const {BrowserWindow} = remote;
const klawSync = require('klaw-sync');
const fs = require('fs-extra');
const _ = require('underscore');
const path = require('path');

let Plugins = [];

let tblPosition = [["Par défaut","zzz"],[1,"a"],[2,"b"],[3,"c"],[4,"d"],[5,"e"],[6,"f"],[7,"g"],[8,"h"],[9,"i"],[10,"j"],
                   [11,"k"],[12,"l"],[13,"m"],[14,"n"],[15,"o"],[16,"p"],[17,"q"],[18,"r"],[19,"s"],[20,"t"],
                   [21,"u"],[22,"v"],[23,"w"],[24,"x"],[25,"y"],[26,"z"],[27,"za"],[28,"zb"],[29,"zc"],[30,"zd"],
                   [31,"ze"],[32,"zf"],[33,"zg"],[34,"zh"],[35,"zi"],[36,"zj"],[37,"zk"],[38,"zl"],[39,"zm"],[40,"zn"],
                   [41,"zo"],[42,"zp"],[43,"zq"],[44,"zr"],[45,"zs"],[46,"zt"],[47,"zu"],[48,"zv"],[49,"zw"],[50,"zx"],
                   [51,"zy"],[52,"zz"],[53,"zza"],[54,"zzb"],[55,"zzc"],[56,"zzd"],[57,"zze"],[58,"zzf"],[59,"zzg"],[60,"zzh"]];


document.getElementById('exit').addEventListener('click', function(){
     let value = ipcRenderer.sendSync('quitWindowPlugins');
});

document.getElementById('SavePosition').addEventListener('click', function(){

  testBeforeSaveNLPPosition()
  .then(test => {
    if (test == true) {

      let id = ipcRenderer.sendSync('reoderWindowPlugins');
      let win = BrowserWindow.fromId(id);
      let options = {
          type: 'question',
          title: 'Sauvegarder les positions',
          message: 'Plusieurs plugins ont la même position. Voulez-vous quand même les sauvegarder ?',
          detail: 'Les positions seront ignorées au démarrage d\'A.V.A.T.A.R pour ces plugins.\nPrenez le temps de corriger leurs positions :-)',
          buttons: ['Oui', 'Non']
      };

     remote.dialog.showMessageBox(win, options, function(response) {
          if (response == 0) {
            saveNLPPosition()
            .then(() => {
              let notification = document.getElementById('notification');
              notification.innerHTML = "Les positions ont été sauvegardées !";
              notification.opened = true;
            })
          }
      });
    } else {
      saveNLPPosition()
      .then(() => {
        let notification = document.getElementById('notification');
        notification.innerHTML = "Les positions ont été sauvegardées !";
        notification.opened = true;
      })
    }
  })
});


function testBeforeSaveNLPPosition() {
  return new Promise((resolve, reject) => {
    let flagMulti = false;
    for (let i=1; i < tblPosition.length; i++) {
        var even = _.filter(Plugins, function(num) {
          return num[4] == tblPosition[i][1];
        });
        if (even.length > 1) {
            flagMulti = true;
            break;
        }
    }
    resolve(flagMulti);
  })
}


function saveNLPPosition () {
  return new Promise((resolve, reject) => {
    let tblActive = setTblActive();
    let folder = path.normalize ( __dirname+'/../../../core/plugins/');
    for (let i=0; i < Plugins.length; i++) {
      let pluginPropsFile = path.normalize(folder+'/'+Plugins[i][0]+'/'+Plugins[i][0]+'.prop');
      if (fs.existsSync(pluginPropsFile)) {
        let pluginProps = fs.readJsonSync(pluginPropsFile, { throws: false });
        if (Plugins[i][4] != "zzz") {
          pluginProps.modules[Plugins[i][0]].nlpPosition =  getOrder(1, 0, Plugins[i][4])
          fs.writeJsonSync(pluginPropsFile, pluginProps);
        } else {
          if (pluginProps.modules[Plugins[i][0]].nlpPosition != undefined) {
            Reflect.deleteProperty(pluginProps.modules[Plugins[i][0]], 'nlpPosition');
          }
        }
        pluginProps.modules[Plugins[i][0]].active = isActive(Plugins[i][0]);
        fs.writeJsonSync(pluginPropsFile, pluginProps);
        let value = ipcRenderer.sendSync('reloadChangePlugins');
      }
    }

    resolve();
  })
}


function getOrder(searchValue, returnValue, position) {

  let evens = _.filter(tblPosition, function(num){
    return num[searchValue] == position;
  });

  return evens[0][returnValue];
}

function defActive (pluginProps, pluginDir) {
  if  (pluginProps.modules[pluginDir].active != undefined) {
    if (pluginProps.modules[pluginDir].active == true)
      return '<select size="1" id="row-actif-'+pluginDir+'" name="row-actif-'+pluginDir+'"><option value="Oui" selected="selected">Oui</option><option value="Non">Non</option></select>';
    else
      return '<select size="1" id="row-actif-'+pluginDir+'" name="row-actif-'+pluginDir+'"><option value="Oui">Oui</option><option value="Non" selected="selected">Non</option></select>';
  } else {
    return '<select size="1" id="row-actif-'+pluginDir+'" name="row-actif-'+pluginDir+'"><option value="Oui" selected="selected">Oui</option><option value="Non">Non</option></select>';
  }
}


function isActive(plugin) {
  let tblActive = setTblActive();
  let evens = _.filter(tblActive, function(num){
    return num[0] == plugin;
  });
  return (evens.length>0 && evens[0][1] == true ? true : false);
}


function setTblActive() {
  var table = $('#controlPlugins').DataTable();
  var data = table.$('select').serialize();
  data = data.split('&');
  let tblactive = [];
  for(let i=0; i<data.length; i++) {
    tblactive.push(data[i].split('='));
    tblactive[i][0] = tblactive[i][0].substring(tblactive[i][0].indexOf("row-actif-")+10);
    tblactive[i][1] = (tblactive[i][1] == "Oui") ? true : false;
  }
  return tblactive;
}


function getPlugins () {
  return new Promise((resolve, reject) => {
      let pluginDirs = klawSync('./resources/core/plugins', {nofile: true, depthLimit: 1});
      let count = pluginDirs.length;
      for (plugin in pluginDirs) {
        let pluginDir = pluginDirs[plugin].path.substring(pluginDirs[plugin].path.lastIndexOf("\\") + 1);
        if (pluginDir != 'generic') {
          let pluginProps = fs.readJsonSync(pluginDirs[plugin].path+'/'+pluginDir+'.prop', { throws: false });
          Plugins.push(
          [pluginDir,
          (pluginProps.modules[pluginDir].version != undefined ? pluginProps.modules[pluginDir].version : "Inconnu"),
          (pluginProps.modules[pluginDir].nlpPosition != undefined ? '<input type="text" id="row-'+pluginDir+'" name="row-'+pluginDir+'" value="'+pluginProps.modules[pluginDir].nlpPosition+'">' : '<input type="text" id="row-'+pluginDir+'" name="row-'+pluginDir+'" value="Par défaut">'),
          //(pluginProps.modules[pluginDir].active != undefined ? (pluginProps.modules[pluginDir].active == true ? "Oui" : "Non") : "Oui"),
          defActive (pluginProps, pluginDir),
          (pluginProps.modules[pluginDir].nlpPosition != undefined ? getOrder(0, 1, pluginProps.modules[pluginDir].nlpPosition) : "zzz"),
          (pluginProps.modules[pluginDir].description != undefined ? pluginProps.modules[pluginDir].description : "")
        ]);
        }
        if (!--count) {
          resolve();
        }
      }
  })
}

function msgBox (message, detail, callback) {

  let id = ipcRenderer.sendSync('reoderWindowPlugins');
  let win = BrowserWindow.fromId(id);
  let options = {
      type: 'warning',
      title: 'Ordering Plugin',
      message: message,
      detail: detail,
      buttons: []
  };

  remote.dialog.showMessageBox(win, options, function(response) {
        if (response == 0)
            callback();
  });
}

function reOrder(posID, value) {
  var table = $('#controlPlugins').DataTable();
  var indexes = table.rows().eq(0).filter( function (rowIdx) {
    return table.cell( rowIdx, 0 ).data() === posID ? true : false;
  });

  table
  .cell(indexes, 4).data(value)
  .order([4, 'asc'])
  .draw();
}


function changeValue (posID, value) {
    let oriValue = value;
    if (value == '') {
      $('#row-'+posID).val(getOrder(1, 0, "zzz"));
      reOrder(posID,getOrder(0, 1, "Par défaut"));
      return;
    }

    let valueToInt = Number(value);
    value = parseInt(value);
    if (valueToInt.toString().indexOf('.') != -1 || isNaN(valueToInt) || isNaN(value) || !_.isNumber(value)) {
      msgBox('La valeur '+oriValue+' n\'est pas un entier !', 'Entrez uniquement un nombre entre 1 et '+Plugins.length, () => {
        let evens = _.filter(Plugins, function(num){
          return num[0] == posID;
        });

        $('#row-'+posID).val(getOrder(1, 0, evens[0][4]));
      })
      return;
    }

    if (value > 60 || value > Plugins.length) {
      msgBox('La valeur '+oriValue+' est supérieure au nombre maximal de plugins pouvant être ordonnés!', 'Entrez uniquement un nombre entre 1 et '+Plugins.length, () => {
        let evens = _.filter(Plugins, function(num){
          return num[0] == posID;
        });

        $('#row-'+posID).val(getOrder(1, 0, evens[0][4]));
      })
      return;
    }

    let evens = _.filter(Plugins, function(num){
      return getOrder(1, 0,num[4]) == value;
    });

    if (evens.length > 0) {
      msgBox('La valeur '+oriValue+' est déjà prise par le plugin '+evens[0][0], 'Entrez une valeur non utilisée.', () => {
        evens = _.filter(Plugins, function(num){
          return num[0] == posID;
        });
        $('#row-'+posID).val(getOrder(1, 0, evens[0][4]));
      });
      return;
    }

    reOrder(posID, getOrder(0, 1, value));
}


$(document).ready(function() {
  getPlugins()
  .then(() => {
    //console.log('Plugins: ', Plugins)
    $('#controlPlugins').DataTable({
        dom: '<"toolbar">frtip',
        info: false,
        scrollY: '250px',
        scrollCollapse: true,
        paging: false,
        order: [[4, 'asc']],
        data: Plugins,
        columns: [
            { title: 'Plugin' },
            { title: 'Version' },
            { title: 'Position'},
            { title: 'Actif'},
            { title: 'NLP'},
            { title: 'Description'}
        ],
        columnDefs: [
            {
                orderable: false,
                targets: [0,1, 2, 3,5],
            },
            {
                target: 4,
                visible: false,
                searchable: false
            }
        ]
    })

    $('div.toolbar').html('<b>Liste des Plugins dans votre bibiothèque:</b>');

    for (let i=0; i < Plugins.length; i++) {
      $('#row-'+Plugins[i][0]).change(function() {
          changeValue(Plugins[i][0], this.value);
      });
    }
  })

})
