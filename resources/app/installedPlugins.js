const klawSync = require('klaw-sync');
const fs = require('fs-extra');
const cytoscape = require('cytoscape');
const path = require('path');
const JSONEditor = require('jsoneditor/dist/jsoneditor.min.js');
const _ = require('underscore');
const showdown  = require('showdown');
const tree = require('tree-view');
const trash = require('trash');
const {remote, ipcRenderer} = require('electron');
const {Menu, MenuItem, BrowserWindow, dialog, ipcMain, shell} = remote;

let nodesize = 120;
let nodespace = 50;
let startnodespace = 30;

let JSONeditor;
let JSONeditorFile;
let editor;
var buffers = {};
var isClean = {};

let tblPlugins = [];
let selected;
let Config;

let cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: false,
  autounselectify: false,
  zoomingEnabled: false,
  autoungrabify : false,
  selectionType: 'single',
  userZoomingEnabled: false,
  userPanningEnabled: false,
  panningEnabled: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  pixelRatio: 'auto',
  style: cytoscape.stylesheet()
      .selector('node')
      .css({
        'label' : 'data(name)',
        'height': nodesize,
        'width': nodesize,
        'size': nodesize,
        'background-fit': 'cover',
        'border-color': "rgba(226, 45, 17, 1)",
        'border-width': 6,
        'border-opacity': 0,
        "font-size" : "16px",
        "color" : "white",
        "text-wrap": "wrap",
        "text-valign": "bottom",
        "text-halign": "center",
        'text-outline-width': 3,
        'text-outline-color': "rgba(86, 87, 85, 1)"
      })
});



function CLosingWindow (countJS, countJSON, win) {

  let tts;
  if (countJSON == 0) {
    tts = (countJS == 1) ? 'Un fichier dans l\'éditeur n\'a pas été sauvegardé' : 'Plusieurs fichiers dans l\'éditeur n\'ont pas été sauvegardés';
  } else {
    tts = JSONeditorFile.substring(JSONeditorFile.lastIndexOf('/') + 1);
    if (countJS > 0) {
      tts += ' et ';
      tts += (countJS == 1) ? 'un fichier dans l\'éditeur n\'ont pas été sauvegardés' : 'plusieurs fichiers dans l\'éditeur n\'ont pas été sauvegardés';
    } else {
      tts += ' n\'a pas été sauvegardé';
    }
  }

  dialog.showMessageBox(win, {
      type: 'question',
      title: 'Plugins Avatar',
      message: tts,
      detail: 'Vos changements seront perdus si vous fermez la fenêtre sans sauvegarde.',
      buttons: ['Quitter quand même !', 'Retourner dans l\'application']
  }, function(response) {
    switch (response) {
      case 0: win.destroy();
    }
  });

}


window.onbeforeunload = (e) => {

  e.returnValue = undefined;

  let countJS = 0;
  let countJSON = 0;
  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);

  for (var name in buffers)
    if (!buffers[name].isClean(isClean[name].generation)) countJS++;

  if (JSONeditor) {
      let json = JSONeditor.get();
      let currentprop = fs.readJsonSync(JSONeditorFile);
      if (!_.isEqual(json, currentprop)) countJSON = 1;
  }

  (countJS >= 1 || countJSON == 1) ? CLosingWindow(countJS, countJSON, win) : win.destroy();

}



document.getElementById('informations-tab').addEventListener('click', function(){
    if (selected) {
      for (var i in tblPlugins) {
        if (tblPlugins[i].id == selected.id()) {
            tblPlugins[i].tab = 'informations';
            break;
        }
      }
      setTabInformations(tblPlugins[i].id, tblPlugins[i].name, function() {
        setTab('informations');
      })
    }
});


document.getElementById('fontSize-min').addEventListener('click', function(){

  let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });
  if ((pluginProps.plugins.codemirror.fontSize - 1) > 0) {
    editor.display.wrapper.style.fontSize = (pluginProps.plugins.codemirror.fontSize - 1).toString()+"px";
    pluginProps.plugins.codemirror.fontSize = pluginProps.plugins.codemirror.fontSize - 1;
    fs.writeJsonSync('./resources/app/interface.prop', pluginProps);
    onresize();
  }

});


document.getElementById('search-matches').addEventListener('click', function(){

  let tts;
  if (editor && !editor.getOption("highlightSelectionMatches")) {
      editor.setOption("highlightSelectionMatches",{showToken: /\w/, annotateScrollbar: true});
      tts = "Sélection de correspondance activée";
  } else {
    editor.setOption("highlightSelectionMatches", false);
    tts = "Sélection de correspondance désactivée";
  }

  let notification = document.getElementById('notification');
  notification.innerHTML = tts;
  notification.opened = true;

});



document.getElementById('fontSize-add').addEventListener('click', function(){

  let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });
  if ((pluginProps.plugins.codemirror.fontSize + 1) < 30) {
    editor.display.wrapper.style.fontSize = (pluginProps.plugins.codemirror.fontSize + 1).toString()+"px";
    pluginProps.plugins.codemirror.fontSize = pluginProps.plugins.codemirror.fontSize + 1;
    fs.writeJsonSync('./resources/app/interface.prop', pluginProps);
    onresize();
  }

});


function showTermDescription(id, tag) {

  if (!document.getElementById("pluriel-label").style.visibility || document.getElementById("pluriel-label").style.visibility == "hidden") {
    document.getElementById("pluriel-label").style.display = "block";
    document.getElementById("pluriel-label").style.visibility = "visible";
  }

  document.getElementById("tag").innerHTML = tag;
  let tts;
  switch (tag) {
    case 'Modal':
    tts = 'Un Modal comme "est-ce que", "peux", "serait-il" ne concerne ni le sujet ni le prédicat de la relation et est généralement à exclure de la définition de la règle. Comme généralement, un Modal est en début de phrase, vous n\'avez pas besoin de le remplacer par un caractère de remplacement.'
    break;
    case 'Person':
    tts = 'Une Personne comme "je, tu, vous", surtout si vous vous adressez à Avatar ou s\'il est associé à un Modal est généralement à exclure de la définition de la règle. Ne l\'ajoutez que si la personne est nécessaire à votre plugin. Comme généralement, un Modal est en début de phrase, vous n\'avez pas besoin de le remplacer par un caractère de remplacement.'
    break;
    case 'Infinitive':
    tts = 'L\'Infinitif est généralement le verbe à l\'infinitif d\'une intention et est important dans une règle, sauf dans le cas d\'une forme Modal. Vérifiez si ce verbe à l\'infinitif est indispensable à l\'exécution de la règle, si oui, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme" sinon supprimez-le.'
    break;
    case 'Verb':
    tts = 'Le Verbe est généralement le verbe d\'une intention et est important dans une règle, sauf dans le cas d\'une forme Modal. Vérifiez si ce verbe est indispensable à l\'exécution de la règle, si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Adverb':
    tts = 'Un Adverbe sert généralement à modifier le sens d\'un verbe, d\'un adjectif ou encore d\'un nom et peut être important dans une règle. Vérifiez si cet adverbe est indispensable à l\'exécution de la règle, si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'PastTense':
    tts = 'Le Passé est généralement un verbe conjugué d\'une intention et est important dans une règle, sauf dans le cas d\'une forme Modal. Vérifiez si ce verbe est indispensable à l\'exécution de la règle, si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'PresentTense':
    tts = 'Le Présent est généralement un verbe conjugué d\'une intention et est important dans une règle, sauf dans le cas d\'une forme Modal. Vérifiez si ce verbe est indispensable à l\'exécution de la règle, si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'FutureTense':
    tts = 'Le Futur est généralement un verbe conjugué d\'une intention et est important dans une règle, sauf dans le cas d\'une forme Modal. Vérifiez si ce verbe est indispensable à l\'exécution de la règle, si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Determiner':
    tts = 'Un Determineur comme "le ,la, les" est généralement à exclure de la définition de la règle. Vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Adjective':
    tts = 'Un Adjective est généralement le sujet ou le prédicat d\'une intention et est important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Actor':
    tts = 'Un Acteur est généralement le sujet ou le prédicat d\'une intention et est important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Noun':
    tts = 'Un Nom est généralement le sujet ou le prédicat d\'une intention et est important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Organization':
    tts = 'Une Organisation est généralement le sujet ou le prédicat d\'une intention et est important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Country':
    tts = 'Un Pays est généralement le sujet ou le prédicat d\'une intention et est important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Question':
    tts = 'Une question peut être importante dans une règle. Si tel est le cas, elle sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme" sinon supprimez-le.'
    break;
    case 'Copula':
    tts = 'Un Copula peut être important dans une règle. Si tel est le cas, il sera alors à ajouter. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme" sinon supprimez-le.'
    break;
    case 'Expression':
    tts = 'Une Expression comme "s\'il te plait" ne concerne ni le sujet ni le prédicat de la relation et est généralement à exclure de la définition de la règle. Si ce terme n\'est pas en début ou en fin de phrase et que vous voulez l\'ignorer, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Pronoun':
    tts = 'Un Pronom comme "je, tu, il" ou "eux,moi,toi" dans une forme Modal, est généralement à exclure de la définition de la règle. Comme généralement, un Modal est en début ou en fin de phrase, vous n\'avez pas besoin de le remplacer et est donc à ignorer. Dans le cas contraire, vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Preposition':
    tts = 'Une Preposition comme "à, chez, de, d\', pour" précède normalement un Infinitive, un Verb, un Nom, une Valeur ou un Adjective et est généralement à exclure de la définition de la règle. Vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Possessive':
    tts = 'Un Possessif comme "mon, ma, ta" précède normalement un nom et est généralement à exclure de la définition de la règle. Vous pouvez le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
    case 'Conjunction':
    tts= 'Une Conjunction est généralement ajoutée pour joindre deux mots ou groupes de mots. Si dans la règle, un mot est ajouté avant la Conjunction, vous pouvez la remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme" sinon vous pouvez l\'ignorer.'
    break;
    case 'Value':
    tts= 'Une valeur est généralement à exclure de la définition de la règle pour pouvoir être manipulée directement dans le plugin. Vérifiez si cette valeur est indispensable à l\'exécution de la règle, si tel est le cas, elle sera alors à ajouter.'
    break;
    case 'Date':
    tts= 'Une Date est généralement à exclure de la définition de la règle pour pouvoir être manipulée directement dans le plugin. Vérifiez si cette valeur est indispensable à l\'exécution de la règle, si tel est le cas, elle sera alors à ajouter.'
    break;
    default:
    tts= 'Aucune information. Vérifiez si le terme est nécessaire à la règle. Vous pouvez aussi le remplacer par une étoile (*) qui signifie "tous les termes jusqu\'à" ou un point (.) qui signifie "n\'importe quel terme".'
    break;
  }

  document.getElementById("descr").innerHTML = tts;

}


function pluginRule (terms) {

  let ignored = ["Adverb","Date","Modal","Person","Determiner","Verb","Expression","Pronoun","Preposition","Conjunction","Possessive","Value"];
  let added = ["?","Question","Actor","Infinitive","PastTense","PresentTense","FutureTense","Adjective","Noun","Organization","Country"];
  let rule;
  let term;
  for (i in terms) {
    if (terms[i].text && terms[i].text.length > 0)
      term = terms[i].text;
    if (terms[i].normal)
      term = terms[i].normal;
    if (terms[i].expansion)
      term = terms[i].expansion;
    if (terms[i].pos && (terms[i].pos.Plural || (terms[i].pos.Verb && terms[i].pos.PresentTense)) && term[term.length -1] == 's') {
      term = term.substring(0, term.length - 1);
    }

    let tag;
    if (terms[i].tag)
      tag = terms[i].tag;
    if (!tag && terms[i].pos && terms[i].pos.Verb)
      tag = 'Verb';

    if (rule && _.indexOf(ignored,tag) != -1 && i > 0 && i < terms.length - 1) {
      if (rule[rule.length - 1] != '*')
          rule += " *";
    } else if (_.indexOf(added,tag) != -1 && i == 0) {
        rule = term;
    } else if (_.indexOf(added,tag) != -1 && i > 0) {
        rule = (rule) ? rule + " " + term : term;
    } else if (rule && rule[rule.length - 1] != '*' && i < terms.length - 1) {
        rule += " *";
    } else if (!rule && _.indexOf(ignored,tag) != -1 && terms.length == 1) {
        rule = term;
    }
  }

  if (rule) {
    if (rule[rule.length - 1] == '*')
      rule = rule.substring(0, rule.length - 2);
    document.getElementById("plugin-rule-exemple").value = rule;
  }
}



document.getElementById('do-clean').addEventListener('click', function(){

  document.getElementById("translate-rule").value = "";
  document.getElementById("translated-rule").value = "";
  cleanRuleEditor();

})


function cleanRuleEditor () {

  document.getElementById("plugin-rule-exemple").value = "";
  document.getElementById("tag").innerHTML = "";
  const xTermTab = document.getElementById("term-group");
  while (xTermTab.firstChild) {
      xTermTab.firstChild.remove();
  }
  document.getElementById("descr").innerHTML = "";
  if (document.getElementById("pluriel-label").style.visibility)
    document.getElementById("pluriel-label").style.visibility = "hidden";

}




function checkTermOrSyntax (sentence) {
  let pluginDir = JSONeditorFile.substring(0,JSONeditorFile.lastIndexOf('/'));
  let pluginFiles = klawSync(pluginDir, {nodir: true, depthLimit: 0});
  let intentfile;
  for (file in pluginFiles) {
    if (pluginFiles[file].path.substring(pluginFiles[file].path.lastIndexOf("\\") + 1).indexOf('intent.') != -1) {
      intentfile = pluginFiles[file].path;
      break;
    }
  }

  if (intentfile) {
    let text = fs.readFileSync(intentfile, 'utf8');
    if (text.indexOf('_helpers.syntax') != -1) {
      return true;
    } else {
      return (sentence.indexOf(' ') != -1) ? false : true;
    }
  } else {
    return -1;
  }
}




document.getElementById('do-translate').addEventListener('click', function(){

  if (document.getElementById("translate-rule").value != '') {

      let check = checkTermOrSyntax(document.getElementById("translate-rule").value);
      if (check != true) {
          let msg = (!check)
          ? 'Ce plugin a une définition de règle par termes, vous ne pouvez pas y ajouter une règle par la syntaxe d\'une phrase.'
          : 'Ce plugin n\'a pas de fichier d\'intention, vous ne pouvez pas définir de règle.';
          let id = ipcRenderer.sendSync('infoPlugins', 'id');
          let win = BrowserWindow.fromId(id);
          dialog.showMessageBox(win, {type: 'warning',
              title: 'Plugin Studio',
              message: 'Attention !',
              detail: msg
           });
           return;
      }

      cleanRuleEditor();

      let state = ipcRenderer.sendSync('translate', document.getElementById("translate-rule").value);
      if (state) {
        if (!state.terms) {
          document.getElementById("translated-rule").value = "Cette phrase est déjà une règle de plugin. Vous ne pouvez pas l'utiliser.";
          return;
        }

        if (state.translated.from.text.autoCorrected) {
          state.translated.from.text.value = state.translated.from.text.value.replace(/\[/g,'').replace(/\]/g,'');
          document.getElementById("translate-rule").value = state.translated.from.text.value;
        }

        document.getElementById("translated-rule").value = state.translated.text;

        const xTermTab = document.getElementById("term-group");

        // Affichage et traitement des Termes
        let term;
        for (i in state.terms) {
          if (state.terms[i].text && state.terms[i].text.length > 0)
            term = state.terms[i].text;
          if (state.terms[i].normal)
            term = state.terms[i].normal;
          if (state.terms[i].expansion)
            term = state.terms[i].expansion;
          if (state.terms[i].pos && state.terms[i].pos.Plural && term[term.length -1] == 's')
            term = term.substring(0, term.length - 1);

          let tag;
          if (state.terms[i].tag)
            tag = state.terms[i].tag;
          if (!tag && state.terms[i].pos && state.terms[i].pos.Verb)
            tag = 'Verb';

          let newTerm = document.createElement("x-tab");
          let newTermLabel = document.createElement("x-label");
          newTermLabel.className = 'term-label';
          let id = term.replace(/ /g,'-');
          newTerm.setAttribute('id', id);
          newTerm.onclick = function() { showTermDescription(id, tag); };
          let label = document.createTextNode(term);
          newTermLabel.appendChild(label);
          newTerm.appendChild(newTermLabel);
          xTermTab.appendChild(newTerm);
        }

        pluginRule(state.terms);

      } else {
        document.getElementById("translated-rule").value = "Erreur de traduction...";
      }
  }

});



function fullscreen (state) {

  if (state) {
    document.getElementById("navfiles").style.visibility = "hidden";
    document.getElementById("menufiles").style["margin-left"] = "0px";
    document.getElementsByClassName("CodeMirror")[0].style.left = "0px";
    document.getElementsByClassName("CodeMirror")[0].style.width = "100%"
    document.getElementById("editor").style["margin-left"] = "0px";
    document.getElementById("editor").style.width = "100%"
    document.getElementById("statusbar").style["margin-left"] = "0px";
    document.getElementById("statusbar").style.width = "100%"
  } else {
    document.getElementById("navfiles").style.visibility = "visible";
    document.getElementById("menufiles").style["margin-left"] = "171px";
    document.getElementsByClassName("CodeMirror")[0].style.left = "171px";
    document.getElementsByClassName("CodeMirror")[0].style.width = "calc(100% - 171px)";
    document.getElementById("editor").style["margin-left"] = "171px";
    document.getElementById("editor").style.width = "calc(100% - 171px)"
    document.getElementById("statusbar").style["margin-left"] = "171px";
    document.getElementById("statusbar").style.width = "calc(100% - 171px)"
  }

}



document.getElementById('x-theme-status').addEventListener('click', function(ev){
  ev.preventDefault();
  let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });

  let themeMenu = [
    {
        label: 'lesser-dark',
        click: () => {setTheme('lesser-dark')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'lesser-dark') ? true : false
    },
    {
        label: 'eclipse',
        click: () => {setTheme('eclipse')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'eclipse') ? true : false
    },
    {
        label: 'ambiance',
        click: () => {setTheme('ambiance')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'ambiance') ? true : false
    },
    {
        label: 'xq-dark',
        click: () => {setTheme('xq-dark')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'xq-dark') ? true : false
    },
    {
        label: '3024-night',
        click: () => {setTheme('3024-night')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == '3024-night') ? true : false
    },
    {
        label: 'abcdef',
        click: () => {setTheme('abcdef')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'abcdef') ? true : false
    },
    {
        label: 'base16-dark',
        click: () => {setTheme('base16-dark')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'base16-dark') ? true : false
    },
    {
        label: 'bespin',
        click: () => {setTheme('bespin')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'bespin') ? true : false
    },
    {
        label: 'darcula',
        click: () => {setTheme('darcula')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'darcula') ? true : false
    },
    {
        label: 'dracula',
        click: () => {setTheme('dracula')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'dracula') ? true : false
    },
    {
        label: 'duotone-light',
        click: () => {setTheme('duotone-light')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'duotone-light') ? true : false
    },
    {
        label: 'elegant',
        click: () => {setTheme('elegant')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'elegant') ? true : false
    },
    {
        label: 'erlang-dark',
        click: () => {setTheme('erlang-dark')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'erlang-dark') ? true : false
    },
    {
        label: 'material',
        click: () => {setTheme('material')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'material') ? true : false
    },
    {
        label: 'mbo',
        click: () => {setTheme('mbo')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'mbo') ? true : false
    },
    {
        label: 'mdn-like',
        click: () => {setTheme('mdn-like')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'mdn-like') ? true : false
    },
    {
        label: 'pastel-on-dark',
        click: () => {setTheme('pastel-on-dark')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'pastel-on-dark') ? true : false
    },
    {
        label: 'rubyblue',
        click: () => {setTheme('rubyblue')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'rubyblue') ? true : false
    },
    {
        label: 'the-matrix',
        click: () => {setTheme('the-matrix')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'the-matrix') ? true : false
    },
    {
        label: 'zenburn',
        click: () => {setTheme('zenburn')},
        type: 'checkbox',
        checked: (pluginProps.plugins.codemirror.theme == 'zenburn') ? true : false
    }
  ];

  var handler = function (e) {
    e.preventDefault();
    menu.popup({window: remote.getCurrentWindow()});
    window.removeEventListener('click', handler, false);
  }

  const menu = Menu.buildFromTemplate(themeMenu);
  window.addEventListener('click', handler, false);
  return false;
});


function PropertyFileSave () {

  if (JSONeditor && JSONeditorFile) {
      fs.writeJsonSync(JSONeditorFile, JSONeditor.get());
      let json = JSONeditorFile.substring(JSONeditorFile.lastIndexOf('/') + 1);
      let notification = document.getElementById('notification');
      notification.innerHTML = "Fichier " + json + " sauvegardé";
      notification.opened = true;
  }

}


let ruleEditor = true;
function activateRuleEditor() {

  if (ruleEditor) {
    document.getElementById('capsjsoneditor').style.height = "calc(100% - 400px)";
    document.getElementById("translate").style.display = "block";
    document.getElementById("translate").style.visibility = "visible";
  } else {
    document.getElementById('capsjsoneditor').style.height = "100%";
    document.getElementById("translate").style.display = "none";
    document.getElementById("translate").style.visibility = "hidden";
  }

}



document.getElementById('jsoneditor').addEventListener('contextmenu', function(ev){
  ev.preventDefault();

  let themeMenu = [
    {
        label: 'Sauvegarder',
        icon: 'resources/app/images/icons/save.png',
        click: () => {PropertyFileSave()}
    },
    {type: 'separator'},
    {
        label: ruleEditor ? 'Editeur de règles' : 'Fermer l\'éditeur de règles',
        icon: 'resources/app/images/icons/rule-editor.png',
        click: () => {
            activateRuleEditor();
            ruleEditor = !ruleEditor;
        }
    }
  ];

  var handler = function (e) {
    e.preventDefault();
    menu.popup({window: remote.getCurrentWindow()});
    window.removeEventListener('contextmenu', handler, false);
  }

  const menu = Menu.buildFromTemplate(themeMenu);
  window.addEventListener('contextmenu', handler, false);
  return false;
});



function setTheme(theme) {
  if (editor) {
    editor.setOption("theme", theme);
    onresize();
    document.getElementById('x-theme-status').innerHTML = theme;
    let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });
    pluginProps.plugins.codemirror.theme = theme;
    fs.writeJsonSync('./resources/app/interface.prop', pluginProps);
  }
}



document.getElementById('help-editor').addEventListener('click', function(){

    if (document.getElementById("infoEditor").value) {
      setEditorHelp(false);
    } else {
      setEditorHelp(true);
    }

});


document.getElementById('properties-tab').addEventListener('click', function(){
  if (selected) {
    setTabProperties(selected.id(), function() {
      for (var i in tblPlugins) {
        if (tblPlugins[i].id == selected.id()) {
            tblPlugins[i].tab = 'properties';
            break;
        }
      }
      setTab('properties');
    });
  }
});


document.getElementById('files-tab').addEventListener('click', function(){
  if (selected) {
    for (var i in tblPlugins) {
      if (tblPlugins[i].id == selected.id()) {
          tblPlugins[i].tab = 'files';
          break;
      }
    }
    setTabfiles(selected.id(), function() {
      setTab('files');
    })
  }
});



function setEditorHelp(state) {

  if (!state) {
    document.getElementById("infoEditor").style.display = "none";
    document.getElementById("infoEditor").style.visibility = "hidden";
    document.getElementById("infoEditor").value = false;
    document.getElementById('editor').style.visibility = "visible";
    document.getElementById('editor').style.display = "block";
  } else {
    document.getElementById('editor').style.visibility = "hidden";
    document.getElementById('editor').style.display = "none";
    document.getElementById("infoEditor").style.display = "block";
    document.getElementById("infoEditor").style.visibility = "visible";
    document.getElementById("infoEditor").value = true;
  }

}


function walkToPlugins () {

    let pluginDirs = klawSync('./resources/core/plugins', {nofile: true, depthLimit: 1});

    for (plugin in pluginDirs) {
      let pluginDir = pluginDirs[plugin].path.substring(pluginDirs[plugin].path.lastIndexOf("\\") + 1);
      let pluginProps = fs.readJsonSync(pluginDirs[plugin].path+'/'+pluginDir+'.prop', { throws: false });
      let pluginName = (pluginProps && pluginProps.modules[pluginDir] && pluginProps.modules[pluginDir].name) ? pluginProps.modules[pluginDir].name : pluginDir;

      addCY (pluginDir, pluginName, plugin);
    }

}



function addCYCreatePlugin () {

  let img = path.normalize (__dirname + '/images/icons/createPlugin.jpg');

  cy.add(
    { group: "nodes",
      data: { id: 'createPlugin', name: "Créer un plugin"}
    }
  );

  let s = cy.$('#createPlugin');
  style = {
      'background-image': "url('" + img+"')"
  };
  s.style(style);
  s.renderedPosition('x', document.getElementById('cy-plugins').offsetWidth / 2);
  s.renderedPosition('y', nodespace + startnodespace);

  cy.$('#createPlugin').addClass("createPlugin");

  s.on('tap', function(evt){
    createPlugin();
  });

  s.lock();

}



function restartInterface() {

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);
  remote.dialog.showMessageBox(win, {
      type: 'question',
      title: 'Plugins Avatar',
      message: 'Voulez-vous redémarrer Avatar maintenant pour prendre en compte le nouveau Plugin ?',
      detail: 'Le plugin ne sera pas pris en compte tant qu\'Avatar ne sera pas redémarré.',
      buttons: ['Redémarrer', 'Plus tard']
  }, function(response) {
    switch (response) {
      case 0:
        let state = ipcRenderer.sendSync('reload');
    }
  });

}


function createPlugin() {

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let top = BrowserWindow.fromId(id);
  var style = {
    parent: top,
    movable: true,
    resizable: true,
    minimizable: false,
    show: false,
    width: 720,
    height: 660,
    icon: 'resources/app/images/Avatar.png',
    title: 'Créer un Plugin'
  }

  let createPluginWindow = new BrowserWindow(style);

  createPluginWindow.loadFile('./assets/html/createPlugin.html');
  //pluginsWindow.setMenu(null);
  //createPluginWindow.openDevTools();

  createPluginWindow.once('ready-to-show', () => {
      createPluginWindow.show();
  })

  createPluginWindow.on('closed', function () {
    ipcMain.removeAllListeners('infos');
    createPluginWindow = null;
  })

  ipcMain.on('infos', (event, arg) => {
    switch (arg) {
      case 'quit':
        createPluginWindow.close();
        restartInterface();
        break;
      case 'getPlugins':
        event.returnValue = tblPlugins;
        break;
      case 'id' :
        event.returnValue = createPluginWindow.id;
        break;
    }
  })

}


function addCY (plugin, name, count) {

    let img = (fs.existsSync('./resources/core/plugins/'+plugin+'/assets/images/'+plugin+'.png'))
        ? path.normalize (__dirname + '/../core/plugins/'+plugin+'/assets/images/'+plugin+'.png')
        : path.normalize (__dirname + '/images/icons/plugin.png');

    let Props = fs.readJsonSync('./resources/core/plugins/'+plugin+'/'+plugin+'.prop', { throws: false });
    let testProp = true;
    testProp = Props.modules[plugin];
    if (!testProp) {
      let state = ipcRenderer.sendSync('error', 'Une différence existe entre les différents noms pour le plugin '+plugin+'. Les noms de répertoire, de fichiers et de module (propriété) doivent être identiques. Corrigez le problème.');
    }

    cy.add(
      { group: "nodes",
        data: { id: plugin, name: (Config.modules[plugin] && (Config.modules[plugin].active || Config.modules[plugin].active == undefined)) ? name : ((testProp) ? name + "\n(Inactif)" : name + "\n(Ignoré)")}
      }
    );

    let s = cy.$('#'+plugin);
    style = {
        'background-image': "url('" + img+"')"
    };
    s.style(style);
    s.renderedPosition('x', document.getElementById('cy-plugins').offsetWidth / 2);
    s.renderedPosition('y', ((count == 0) ? (nodespace + (nodesize / 2) + (nodesize + startnodespace - 10)) : (((nodespace + nodesize) * count) + (nodesize + startnodespace - 10) + (nodespace + (nodesize/2)))));

    cy.$('#'+plugin).addClass("plugin");

    if (testProp) {
      s.on('tap', function(evt){
        if (selected && selected.id() == evt.target.id() && plugin != 'generic') {
            showPluginMenu(plugin, name, evt.target);
        } else if (!selected || (selected && selected.id() != evt.target.id())){
            showtab(evt.target);
        }
      });
    }

    s.lock();

    if (window.innerHeight < (((nodespace + nodesize) * count) + (nodespace + nodesize))) {
      document.getElementById('cy').style.height = (((nodespace + nodesize) * count) + (nodespace + nodesize)) + nodespace + (nodesize + startnodespace) + "px";
    }
}



function showPluginMenu (plugin, name, ele) {

  let pluginMenu = [
    {
        label: (Config.modules[plugin] && (Config.modules[plugin].active || Config.modules[plugin].active == undefined)) ? 'Désactiver' : 'Activer',
        icon: (Config.modules[plugin] && (Config.modules[plugin].active || Config.modules[plugin].active == undefined)) ? 'resources/app/images/icons/desactivate.png' : 'resources/app/images/icons/activate.png',
        click: () => {activatePlugin(plugin, name, ele, (Config.modules[plugin] && (Config.modules[plugin].active || Config.modules[plugin].active == undefined)) ? false : true)}
    },
    {type: 'separator'}
  ];

  if (Config.modules[plugin] && (Config.modules[plugin].active || Config.modules[plugin].active == undefined)) {
    pluginMenu.push(
        {
            label: 'Recharger',
            icon: 'resources/app/images/icons/restart.png',
            click: () => {reloadPlugin(plugin, name)}
        }
    );
  }

  pluginMenu.push(
    {
        label: 'Supprimer',
        icon: 'resources/app/images/icons/close.png',
        click: () => {deletePlugin(plugin)}
    }
  );

  if (fs.existsSync('./resources/core/plugins/'+plugin+'/documentation')) {
    if (fs.existsSync('./resources/core/plugins/'+plugin+'/documentation/documentation.ini')) {
      let docProps = fs.readJsonSync(path.normalize (__dirname + '/../core/plugins/'+plugin+'/documentation/documentation.ini', { throws: false }));
      if (docProps && docProps.start) {
          pluginMenu.push(
            {type: 'separator'},
            {
                label: 'Documentation',
                icon: 'resources/app/images/icons/help.png',
                click: () => {
                  let done = ipcRenderer.sendSync('documentation', {static: docProps.static, path: path.normalize (__dirname + '/../core/plugins/'+plugin+'/documentation'), file: docProps.start});
                }
            }
          );
        } else {
            let back = ipcRenderer.sendSync('error', 'La propriété start est manquante dans le fichier documentation.ini du plugin '+name);
        }
    } else {
      let back = ipcRenderer.sendSync('error', 'Le fichier documentation.ini est absent dans la documentation du plugin '+name);
    }

  }

  //var handler = function (e) {
  //  e.preventDefault();
  //  menu.popup({window: remote.getCurrentWindow()});
  //  window.removeEventListener('contextmenu', handler, false);
  //}

  const menu = Menu.buildFromTemplate(pluginMenu);
  menu.popup({window: remote.getCurrentWindow()});
  //window.addEventListener('contextmenu', handler, false);

}


function reloadPlugin(plugin, name){

  let propsFile = path.normalize (__dirname + '/../core/plugins/'+plugin+'/'+plugin+'.prop');
  let props = fs.readJsonSync(propsFile, { throws: false });
  let done = ipcRenderer.sendSync('reloadPlugin', {plugin: plugin, props: propsFile, module: props.modules, cron: (props.cron) ? props.cron: undefined});

  let notification = document.getElementById('notification');
  notification.innerHTML = "Plugin " + name + " rechargé";
  notification.opened = true;
}



function deletePlugin(plugin) {

   handleDeleteButton (plugin, plugin, true, function() {
        for (var name in buffers) {
            let folder;
            if  (name.lastIndexOf('\\') != - 1) {
              folder = name.substring(0, name.indexOf('/\\'));
            } else if ((name.indexOf('//') != - 1) && (name.indexOf('/\\') == - 1)) {
              folder = name.substring(0, name.indexOf('//'));
            } else {
              dialog.showErrorBox('Erreur', "Impossible de supprimer le plugin");
              return;
            }
            if (folder == plugin) {
                removeTab(name);
            }
        }

        if (JSONeditor) {
            let json = JSONeditor.get();
            if (json.modules[plugin]) {
              JSONeditor.destroy();
              JSONeditor = null;
              JSONeditorFile = null;
            }
        }

        tblPlugins = _.filter(tblPlugins, function(num) {
          return num.id != plugin;
        });

        let collection = cy.filter(function(element, i){
          if (element.hasClass('plugin'))
            return true;
            return false;
        });

        cy.remove(collection);
        walkToPlugins();
        setPluginEmptyTab();

        let done = ipcRenderer.sendSync('unloadPlugin');

    });

}



function activatePlugin(plugin, name, ele, state) {

   cy.$('#'+plugin).data('name', (state) ? name.replace("\n(Inactif)", "") : name + "\n(Inactif)");

   let fileProps = path.normalize (__dirname + '/../core/plugins/'+plugin+'/'+plugin+'.prop');
   let pluginProps = fs.readJsonSync(fileProps, { throws: false });
   pluginProps.modules[plugin].active = state;
   fs.writeJsonSync(fileProps, pluginProps);

   if (Config.modules[plugin]) {
     Config.modules[plugin].active = state;
   } else {
     let extend  = require('extend');
     extend(true, Config, pluginProps);
   }

   if (JSONeditor) {
     let json = JSONeditor.get();
     if (json.modules[plugin]) {
        if ((json.modules[plugin].active && json.modules[plugin].active != state) || !json.modules[plugin].active) {
          JSONeditor.destroy();
          JSONeditor = null;
          let container = document.getElementById("jsoneditor");
          JSONeditor = new JSONEditor(container);
          json.modules[plugin].active = state;
          JSONeditor.set(json);
          JSONeditor.expandAll();
        }
     }
   }

   let done = ipcRenderer.sendSync('refreshCache', Config);

}


function showtab (ele) {

  if (selected) {
    selected.unselect();
    selected.style ({
      'border-opacity': 0
    });
  }

  ele.select();
  selected = ele;
  ele.style ({
    'border-opacity': 1
  });

  let plugin = _.find(tblPlugins, function(num){
  		return num.id == ele.id();
  });

  if (!plugin) {
    tblPlugins.push({id: ele.id(), name: ele.data('name'), tab: 'informations'});
    setTabInformations(ele.id(), ele.data('name'), function() {
      setTab('informations');
    })
  } else {
    switch (plugin.tab) {
      case 'informations':
        setTabInformations(plugin.id, plugin.name, function() {
          setTab(plugin.tab);
        });
      break;
      case 'properties':
        setTabProperties(plugin.id, function() {
          setTab(plugin.tab);
        });
      break;
      case 'files':
        setTabfiles(plugin.id, function() {
          setTab(plugin.tab);
        });
      break;
    }
  }

}



function setPluginEmptyTab () {

  let tabs = document.getElementsByClassName("plugin-infos");
  for (i = 0; i < tabs.length; i++) {
      tabs[i].style.display = "none";
  }

  let link = document.getElementsByClassName("plugins-tab");
  for (i = 0; i < link.length; i++) {
      link[i].className = link[i].className.replace(" active", "");
      link[i].selected = false;
  }

  document.getElementsByClassName("plugin-empty")[0].style.display = "block";

}


function setTab (selected) {

  document.getElementsByClassName("plugin-empty")[0].style.display = "none";
  let tabs = document.getElementsByClassName("plugin-infos");
  for (i = 0; i < tabs.length; i++) {
      tabs[i].style.display = "none";
  }

  let link = document.getElementsByClassName("plugins-tab");
  for (i = 0; i < link.length; i++) {
      link[i].className = link[i].className.replace(" active", "");
      link[i].selected = false;
  }

  document.getElementById(selected).style.display = "block";
  document.getElementById(selected+'-tab').className += " active";
  document.getElementById(selected+'-tab').selected = true;
}


function setTabInformations (plugin, name, callback) {
    let text;
    if (fs.existsSync('./resources/core/plugins/'+plugin+'/assets/infos.md')) {
      text = fs.readFileSync('./resources/core/plugins/'+plugin+'/assets/infos.md', 'utf8');
    } else {
      text = "# "+name.replace("\n(Inactif)","")+"\n\nAucune description";
      fs.ensureDirSync('./resources/core/plugins/'+plugin+'/assets');
      fs.writeFileSync('./resources/core/plugins/'+plugin+'/assets/infos.md', text, 'utf8');
    }
    var converter = new showdown.Converter();
    converter.setOption('headerLevelStart', 2);
    converter.setOption('tasklists', true);
    converter.setOption('ghCompatibleHeaderId', true);
    converter.setOption('rawHeaderId', true);
    converter.setOption('literalMidWordAsterisks', true);
    converter.setOption('strikethrough', true);
    converter.setOption('tables', true);
    converter.setOption('ghCodeBlocks', true);
    converter.setOption('tablesHeaderId', true);
    converter.setOption('simpleLineBreaks', true);
    converter.setOption('openLinksInNewWindow', true);
    converter.setOption('backslashEscapesHTMLTags', true);
    converter.setOption('emoji', true);
    converter.setOption('simplifiedAutoLink', true);
    converter.setOption('parseImgDimensions', true);
    converter.setOption('excludeTrailingPunctuationFromURLs', true);

    var html = converter.makeHtml(text);

    document.getElementById("markdown").innerHTML = html;

    callback();
}



function savePluginProperties (JSONeditorFile, plugin, callback) {

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);
  let json = JSONeditorFile.substring(JSONeditorFile.lastIndexOf('/') + 1);
  remote.dialog.showMessageBox(win, {
      type: 'question',
      title: 'Plugins Avatar',
      message: json + ' a changé, voulez-vous le sauvegarder ?',
      detail: 'Vos changements seront perdus si vous ouvrez un autre fichier de propriétés sans sauvegarde.',
      buttons: ['Sauvegarder', 'Ne pas sauvegarder', 'annuler']
  }, function(response) {
    switch (response) {
      case 0:
        fs.writeJsonSync(JSONeditorFile, JSONeditor.get());
        JSONeditor.destroy();
        JSONeditor = null;
        JSONeditorFile = null;
        let notification = document.getElementById('notification');
        notification.innerHTML = "Fichier " + json + " sauvegardé";
        notification.opened = true;
        setTabProperties (plugin, callback);
        break;
      case 1:
        JSONeditor.destroy();
        JSONeditor = null;
        JSONeditorFile = null;
        setTabProperties (plugin, callback);
        break;
      case 2:
        break;
    }
  });



}



function setTabProperties (plugin, callback) {


    let currentJsonFile = (JSONeditorFile) ? JSONeditorFile.substring(JSONeditorFile.lastIndexOf('/') + 1, JSONeditorFile.length - 5) : null;

    if (!currentJsonFile || currentJsonFile != plugin) {

        if (JSONeditor) {
          let json = JSONeditor.get();
          let currentprop = fs.readJsonSync(JSONeditorFile);

          if (!_.isEqual(json, currentprop))
            return savePluginProperties (JSONeditorFile, plugin, callback);

          JSONeditor.destroy();
          JSONeditor = null;
          JSONeditorFile = null;
        }

        let container = document.getElementById("jsoneditor");
        JSONeditor = new JSONEditor(container);

        JSONeditorFile = './resources/core/plugins/'+plugin+'/'+plugin+'.prop';

        const packageObj = fs.readJsonSync(JSONeditorFile);

        JSONeditor.set(packageObj);
        JSONeditor.expandAll();

        callback();
    } else {
        callback();
    }

}


function walkInPlugin (plugin, dir) {

  let pluginpath = (!dir) ? path.normalize(__dirname+ '/../core/plugins/'+plugin) : path.normalize(__dirname+ '/../core/plugins/'+plugin+dir);
  let pluginDirs = klawSync(pluginpath, {depthLimit: 0});
  let packagebrowser = [];

  for (var i in pluginDirs) {
    let file = pluginDirs[i].path.substring(pluginDirs[i].path.lastIndexOf("\\") + 1);
    packagebrowser.push({
      path: (!dir) ? '/'+file : path.join(dir, '/'+file),
      type: (pluginDirs[i].stats.mode == 16822) ? 'directory' : 'file'
    });
  }

  return  _.sortBy(packagebrowser, 'type');

}



function setTabfiles(plugin, callback) {

  let packagebrowser = walkInPlugin(plugin);

  let browser = tree() ;
  browser.on('directory', function(p, entry) {
    let packagebrowser = walkInPlugin(plugin, p);
    browser.directory(p, packagebrowser);
    showFolderMenu(plugin, p);
  })

  browser.on('file', function(p, entry) {
    showFileMenu(plugin, p);
  })

  browser.directory('/', packagebrowser);
  browser.appendTo("div.navfiles");
  if (callback) callback();

}



function showFolderMenu (plugin, file) {

  let folderMenu = [
    {
        label: 'Renommer...',
        icon: 'resources/app/images/icons/rename.png',
        click: () => {handleRenameFolderButton(plugin, plugin+'/'+file)}
    },
    {
        label: 'Supprimer',
        icon: 'resources/app/images/icons/close.png',
        click: () => {handleDeleteButton(plugin, plugin+'/'+file, true)}
    },
    {type: 'separator'},
    {
        label: 'Nouveau dossier',
        icon: 'resources/app/images/icons/new-folder.png',
        click: () => {handleNewFolderButton(plugin, file, true)}
    },
    {
        label: 'Nouveau fichier',
        icon: 'resources/app/images/icons/new-file.png',
        click: () => {handleNewFileButton(plugin, file, true)}
    },
    {
        label: 'Importer un dossier',
        icon: 'resources/app/images/icons/importfolder.png',
        click: () => {handleImportButton(plugin, file, true)}
    },
    {
        label: 'Importer un fichier',
        icon: 'resources/app/images/icons/importfile.png',
        click: () => {handleImportButton(plugin, file)}
    },
    {type: 'separator'},
    {
        label: 'Fenêtre Dos/npm',
        icon: 'resources/app/images/icons/nodejs.png',
        click: () => {handleNpmButton(plugin, file, true)}
    },
    {
        label: 'Afficher dans un explorateur',
        icon: 'resources/app/images/icons/explorer.png',
        click: () => {handleShowItemButton(plugin, file)}
    },
    {type: 'separator'},
    {
        label: 'Rafraichir',
        icon: 'resources/app/images/icons/restart.png',
        click: () => {handleRefreshButton(plugin)}
    }
  ];

  var handler = function (e) {
    e.preventDefault();
    menu.popup({window: remote.getCurrentWindow()});
    window.removeEventListener('contextmenu', handler, false);
  }

  const menu = Menu.buildFromTemplate(folderMenu);
  window.addEventListener('contextmenu', handler, false);


}



function showFileMenu (plugin, file) {

  let fileMenu = [
    {
        label: (!buffers[plugin+'/'+file]) ? 'Ouvrir' : 'Afficher',
        icon: 'resources/app/images/icons/edit.png',
        click: () => {openfile(plugin, file)}
    },
    {type: 'separator'},
    {
        label: 'Sauvegarder   [CTRL-S]',
        icon: 'resources/app/images/icons/save.png',
        enabled: (buffers[plugin+'/'+file] && isClean[plugin+'/'+file] && !buffers[plugin+'/'+file].isClean(isClean[plugin+'/'+file].generation)) ? true : false,
        click: () => {handleSaveButton(plugin+'/'+file, null, true)}
    },
    {
        label: 'Sauvegarder sous...',
        icon: 'resources/app/images/icons/save-as.png',
        click: () => {handleSaveAsButton(plugin, plugin+'/'+file)}
    },
    {type: 'separator'},
    {
        label: 'Renommer...',
        icon: 'resources/app/images/icons/rename.png',
        click: () => {handleRenameButton(plugin, plugin+'/'+file)}
    },
    {
        label: 'Supprimer',
        icon: 'resources/app/images/icons/close.png',
        click: () => {handleDeleteButton(plugin, plugin+'/'+file)}
    },
    {type: 'separator'},
    {
        label: 'Nouveau dossier',
        icon: 'resources/app/images/icons/new-folder.png',
        click: () => {handleNewFolderButton(plugin, file)}
    },
    {
        label: 'Nouveau fichier',
        icon: 'resources/app/images/icons/new-file.png',
        click: () => {handleNewFileButton(plugin, file)}
    },
    {
        label: 'Importer un dossier',
        icon: 'resources/app/images/icons/importfolder.png',
        click: () => {handleImportButton(plugin, file, true)}
    },
    {
        label: 'Importer un fichier',
        icon: 'resources/app/images/icons/importfile.png',
        click: () => {handleImportButton(plugin, file)}
    },
    {type: 'separator'},
    {
        label: 'Fenêtre Dos/npm',
        icon: 'resources/app/images/icons/nodejs.png',
        click: () => {handleNpmButton(plugin, file)}
    },
    {
        label: 'Afficher dans un explorateur',
        icon: 'resources/app/images/icons/explorer.png',
        click: () => {handleShowItemButton(plugin, file)}
    },
    {type: 'separator'},
    {
        label: 'Rafraichir',
        icon: 'resources/app/images/icons/restart.png',
        click: () => {handleRefreshButton(plugin)}
    }
  ];

  var handler = function (e) {
    e.preventDefault();
    menu.popup({window: remote.getCurrentWindow()});
    window.removeEventListener('contextmenu', handler, false);
  }

  const menu = Menu.buildFromTemplate(fileMenu);
  window.addEventListener('contextmenu', handler, false);

}


function getFileMode(file) {

  var m, mode = {mode: null, mime: null}, spec;
  if (m = /.+\.([^.]+)$/.exec(file)) {
    m[1] = (m[1] == 'prop' || m[1] == 'ini') ? 'json' : m[1];
    var info = CodeMirror.findModeByExtension(m[1]);
    if (info) {
      mode.mode = info.mode;
      mode.mime = info.mime;
    }
  } else if (/\//.test(file)) {
    var info = CodeMirror.findModeByMIME(file);
    if (info) {
      mode.mode = info.mode;
      mode.mime = file;
    }
  }

  if (!mode.mime)
    mode.mime = 'text/plain';

  return mode;

}


function openBuffer(name, text, mode) {

  buffers[name] = CodeMirror.Doc(text);
  isClean[name] = {generation: buffers[name].changeGeneration()};

}



function removeTab (name){

  let xDocTab = document.getElementById(name);
  let tabs= document.querySelector('x-doctabs');
  delete buffers[name];
  delete isClean[name];
  if (document.getElementById(name).className.indexOf('active') != -1) {
      let count = 0;
      for (var i in buffers) count++;
      if (count > 0) {
        for (var i in buffers) {
          selectBuffer(i);
          let mode = getFileMode(i);
          handleDocumentChange(i, mode);
          break;
        }
      } else {
        editor.getWrapperElement().parentNode.removeChild(editor.getWrapperElement());
        editor=null;
        handleDocumentChange();
      }
  }
  tabs.closeTab(xDocTab);
}


function closeBuffer(name, change) {

  var buf = buffers[name];
  if (buf && !buf.isClean(isClean[name].generation) && change) {
      let id = ipcRenderer.sendSync('infoPlugins', 'id');
      let win = BrowserWindow.fromId(id);
      remote.dialog.showMessageBox(win, {
          type: 'question',
          title: 'Plugins Avatar',
          message: name.split('//')[1] + ' a changé, voulez-vous le sauvegarder ?',
          detail: 'Vos changements seront perdus si vous fermez le fichier sans sauvegarde.',
          buttons: ['Sauvegarder', 'Ne pas sauvegarder', 'annuler']
      }, function(response) {
        switch (response) {
          case 0:
            handleSaveButton(name, function(status){
               if (status) {
                  removeTab(name);
               } else {
                 dialog.showMessageBox(win, {type: 'error',
                     title: 'Plugins Avatar',
                     message: 'Impossible de sauvegarder le fichier '+name.split('//')[1],
                     detail: 'Vos changements n\'ont pas été sauvegardés.'
                  });
               }
            });
            break;
          case 1:
            removeTab(name);
            break;
          case 2:
            break;
        }
      });
  } else {
    removeTab(name);
  }
}


function selectBuffer(name) {

  setEditorHelp(false);

  var buf = buffers[name];
  if (buf.getEditor()) buf = buf.linkedDoc({sharedHist: true});
  var old = editor.swapDoc(buf);
  var linked = old.iterLinkedDocs(function(doc) {linked = doc;});
  if (linked) {
    for (var name in buffers) if (buffers[name] == old) buffers[name] = linked;
    old.unlinkDoc(linked);
  }
  editor.focus();

  let link = document.getElementsByClassName("openedfile");
  for (i = 0; i < link.length; i++) {
      link[i].className = link[i].className.replace(" active", "");
      link[i].selected = false;
  }

  document.getElementById(name).className += " active";
  document.getElementById(name).selected = true;

}


var RGBLabel = {on: "rgb(93, 173, 226)", off: "rgb(255, 255, 255)"};
function setTabIcon(tabID, flag) {

    document.getElementById(tabID).childNodes[0].style.color = flag ? RGBLabel.on : RGBLabel.off;
    document.getElementById(tabID).childNodes[0].style['font-weight'] = flag ? 'bold' : 'normal';

}



function getActiveDocument () {

  let link = document.getElementsByClassName("openedfile");
  for (i = 0; i < link.length; i++) {
      if (link[i].className.indexOf('active') != -1)
        return link[i].id;
  }

}


function showFile(evt, fileID) {
  selectBuffer(fileID);
  let mode = getFileMode(fileID);
  handleDocumentChange(fileID, mode);
}


function closeFile(evt, fileID) {

  var buf = buffers[fileID];

  if (!buf.isClean(isClean[fileID].generation)) {
      evt.preventDefault();
      closeBuffer(fileID, true);
  } else
      closeBuffer(fileID, false);

}


function openfile (plugin, p) {

  var fileID = plugin+'/'+p;
  if (!buffers[fileID]) {
      setEditorHelp(false);
      let file = path.normalize(__dirname+ '/../core/plugins/'+fileID);
      let xDocTab = document.getElementById("opened-files");
      let newDocTab = document.createElement("x-doctab");
      let newDocTabLabel = document.createElement("x-label");
      //let xlabel = (p.substring(1).indexOf('\\') == -1) ? p.substring(1) : p.substring(1).split('\\')[p.substring(1).split('\\').length -1];
      let fileName = document.createTextNode(p.substring(1));
      newDocTab.setAttribute('id', fileID);
      newDocTab.className = 'openedfile '+plugin;
      newDocTab.onclick = function() { showFile(event, fileID); };
      newDocTab.onclose = function() { closeFile(event, fileID); };
      newDocTabLabel.appendChild(fileName);
      newDocTab.appendChild(newDocTabLabel);
      xDocTab.appendChild(newDocTab);

      let mode = getFileMode(fileID);
      let text = readFileIntoEditor(file);
      openBuffer(fileID, text);
      setCMEditor();
      selectBuffer(fileID);
      handleDocumentChange(fileID, mode);
  } else {
      selectBuffer(fileID);
      let mode = getFileMode(fileID);
      handleDocumentChange(fileID, mode);
  }

}


function handleShowItemButton (plugin, fileID) {

  let folder = path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
  shell.showItemInFolder(folder);

}


function handleNpmButton (plugin, fileID, byFolder) {

  let folder;
  if (fileID.indexOf('/') != - 1) {
    folder = path.normalize(__dirname+ '/../core/plugins/'+plugin);
  } else if  (fileID.lastIndexOf('\\') != - 1) {
    folder =  (!byFolder) ? path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID.substring(0, fileID.lastIndexOf('\\'))) : path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
  } else {
    dialog.showErrorBox('Erreur', "Impossible de récupérer le dossier courant");
    return;
  }

  fs.ensureDirSync(folder + '/node_modules');

  let cmd = "@echo off";
  cmd += "\n";
  cmd += "cd " + folder;
  cmd += "\n";
  cmd += 'call cmd /k "' + path.normalize(__dirname+ '/../core/nodejs/nodevars.bat') + '"';

  fs.ensureDirSync(path.normalize(__dirname + '/lib/npm'));
  fs.writeFileSync('./resources/app/lib/npm/shell.bat', cmd, 'utf8');
  cmd = path.normalize(__dirname + '/lib/npm/shell.bat');
  let opened = shell.openItem(cmd);
  if (!opened)
      dialog.showErrorBox('Erreur', "Impossible d'ouvrir une fenêtre Dos et npm");

}



function handleRefreshButton (plugin) {
  setTabfiles(plugin);
}



function handleImportButton (plugin, fileID, isFolder) {

  let folder;
  if (fileID.indexOf('/') != - 1) {
    folder = path.normalize(__dirname+ '/../core/plugins/'+plugin);
  } else if  (fileID.lastIndexOf('\\') != - 1) {
    folder =  path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID.substring(0, fileID.lastIndexOf('\\')));
  } else {
    dialog.showErrorBox('Erreur', "Impossible de récupérer le dossier courant");
    return;
  }

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);

  let options = {
    title: "Importer",
    defaultPath: path.normalize (__dirname+ '/../core/plugins/'),
    name: 'All Files',
    extensions: ['*'],
    properties: (isFolder) ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections']
  };

  dialog.showOpenDialog(win, options, function (file) {
    if(file && file.length > 0) {
      for (i in file) {
        let newFile = path.normalize (folder + '/' + file[i].substring(file[i].lastIndexOf('\\') + 1));
        fs.copySync(file[i], newFile, {preserveTimestamps : true});
        setTabfiles(plugin);
      }
    }
  });

}




function handleNewFolderButton(plugin, fileID, byFolder) {

  function _cancel () {
    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";
  }

  function _done () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";

    if (document.getElementById("textbox-file").value != '') {
      let file = document.getElementById("textbox-file").value;

      if (file.indexOf(' ') != -1) {
         dialog.showErrorBox('Erreur', "Le nom du répertoire ne doit pas contenir d'espace.");
         return;
      }

      let folder;
      let openFile;
      let newFile;
      if (fileID.indexOf('/') != - 1) {
        folder = (!byFolder) ? path.normalize(__dirname+ '/../core/plugins/'+plugin) : path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
        newFile = path.normalize(folder+'/'+file);
        openFile = (!byFolder) ? '/'+file : fileID.replace(/\//g,'\\')+'\\'+file;
      } else if  (fileID.lastIndexOf('\\') != - 1) {
        folder =  (!byFolder) ? path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID.substring(0, fileID.lastIndexOf('\\'))) : path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
        newFile = path.normalize(folder+'/'+file);
        openFile = newFile.replace(path.normalize(__dirname+ '/../core/plugins/'+plugin), '');
      } else {
        dialog.showErrorBox('Erreur', "Impossible de créer un nouveau répertoire");
        return;
      }

      if (fs.existsSync(newFile)) {
        dialog.showErrorBox('Erreur', "Impossible de créer le répertoire "+file+"\nLe répertoire existe déjà.");
        return;
      }
      try {
        fs.ensureDirSync(newFile);
      } catch (err) {
        let back = ipcRenderer.sendSync('error', err);
        dialog.showErrorBox('Erreur', "Impossible de créer le nouveau répertoire " + newFile);
        return;
      }
      setTabfiles(plugin);
    }
  }

  document.getElementById('x-buttons-cancel-rename-file').addEventListener('click',  _cancel);
  document.getElementById('x-buttons-done-rename-file').addEventListener('click', _done);

  document.getElementById("label-file").innerHTML = "Entrez le nom du nouveau répertoire:";
  document.getElementById("wrapper").style.display = "block";
  document.getElementById("wrapper").style.visibility = "visible";

  document.getElementById("textbox-file").value = "";
  document.getElementById("done-rename-file").innerHTML = "Créer le répertoire";
  document.getElementById("cancel-rename-file").innerHTML = "Annuler";

}




function handleNewFileButton(plugin, fileID, byFolder) {

  function _cancel () {
    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";
  }

  function _done () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";

    if (document.getElementById("textbox-file").value != '') {
      let file = document.getElementById("textbox-file").value;

      if (file.indexOf(' ') != -1) {
         dialog.showErrorBox('Erreur', "Le nom du fichier ne doit pas contenir d'espace.");
         return;
      }

      let folder;
      let openFile;
      let newFile;
      if (fileID.indexOf('/') != - 1) {
        folder = (!byFolder) ? path.normalize(__dirname+ '/../core/plugins/'+plugin) : path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
        newFile = path.normalize(folder+'/'+file);
        openFile = (!byFolder) ? '/'+file : fileID.replace(/\//g,'\\')+'\\'+file;
      } else if  (fileID.lastIndexOf('\\') != - 1) {
        folder =  (!byFolder) ? path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID.substring(0, fileID.lastIndexOf('\\'))) : path.normalize(__dirname+ '/../core/plugins/'+plugin+'/'+fileID);
        newFile = path.normalize(folder+'/'+file);
        openFile = newFile.replace(path.normalize(__dirname+ '/../core/plugins/'+plugin), '');
      } else {
        dialog.showErrorBox('Erreur', "Impossible de créer un nouveau fichier");
        return;
      }

      if (fs.existsSync(newFile)) {
        dialog.showErrorBox('Erreur', "Impossible de créer le fichier "+file+"\nLe fichier existe déjà.");
        return;
      }
      try {
          fs.ensureFileSync(newFile);
      } catch (err) {
        let back = ipcRenderer.sendSync('error', err);
        dialog.showErrorBox('Erreur', "Impossible de créer le nouveau fichier " + newFile);
        return;
      }
      openfile (plugin, openFile);
      setTabfiles(plugin);
    }
  }

  document.getElementById('x-buttons-cancel-rename-file').addEventListener('click',  _cancel);
  document.getElementById('x-buttons-done-rename-file').addEventListener('click', _done);

  document.getElementById("label-file").innerHTML = "Entrez le nom du nouveau fichier:";
  document.getElementById("wrapper").style.display = "block";
  document.getElementById("wrapper").style.visibility = "visible";

  document.getElementById("textbox-file").value = "";
  document.getElementById("done-rename-file").innerHTML = "Créer le fichier";
  document.getElementById("cancel-rename-file").innerHTML = "Annuler";

}



function handleRenameFolderButton (plugin, fileID) {

  function _cancel () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";
  }

  function _done () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";

    if (document.getElementById("textbox-file").value != '') {
      let file = document.getElementById("textbox-file").value;

      if (file.indexOf(' ') != -1) {
         dialog.showErrorBox('Erreur', "Le nom du répertoire ne doit pas contenir d'espace.");
         return;
      }

      let folder;
      if (fileID.lastIndexOf('//') != - 1) {
        folder = path.normalize(__dirname+ '/../core/plugins/'+fileID.split('//')[0]);
      } else if  (fileID.lastIndexOf('\\') != - 1) {
        folder =  path.normalize(__dirname+ '/../core/plugins/'+fileID.substring(0, fileID.lastIndexOf('\\')));
      } else {
        dialog.showErrorBox('Erreur', "Impossible de renommer le répertoire");
        return;
      }

      let oldFile = path.normalize(__dirname+ '/../core/plugins/'+fileID);
      let newFile = path.normalize(folder + '/' + file);

      if (fs.existsSync(newFile)) {
        dialog.showErrorBox('Erreur', "Impossible de renommer le répertoire "+newFile+"\nLe répertoire existe déjà.");
        return;
      }

      try {
        fs.moveSync(oldFile, newFile);
      } catch (err) {
        let back = ipcRenderer.sendSync('error', err);
        dialog.showErrorBox('Erreur', "Impossible de renommer le répertoire");
        return;
      }
      setTabfiles(plugin);
    }
  }

  document.getElementById('x-buttons-cancel-rename-file').addEventListener('click',  _cancel);
  document.getElementById('x-buttons-done-rename-file').addEventListener('click', _done);

  document.getElementById("label-file").innerHTML = "Entrez le nouveau nom du répertoire:";
  document.getElementById("wrapper").style.display = "block";
  document.getElementById("wrapper").style.visibility = "visible";

  let fileName;
  if (fileID.lastIndexOf('//') != - 1)
    fileName = fileID.split('//')[1];
  else if  (fileID.lastIndexOf('\\') != - 1)
    fileName =  fileID.substring(fileID.lastIndexOf('\\') + 1);
  else
    fileName = fileID;
  document.getElementById("textbox-file").value = fileName;

  document.getElementById("done-rename-file").innerHTML = "Renommer";
  document.getElementById("cancel-rename-file").innerHTML = "Annuler";

}



function handleRenameButton (plugin, fileID) {

  function _cancel () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";
  }

  function _done () {

    document.getElementById('x-buttons-cancel-rename-file').removeEventListener('click', _cancel);
    document.getElementById('x-buttons-done-rename-file').removeEventListener('click', _done);

    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapper").style.visibility = "hidden";

    if (document.getElementById("textbox-file").value != '') {
      let file = document.getElementById("textbox-file").value;

      if (file.indexOf(' ') != -1) {
         dialog.showErrorBox('Erreur', "Le nom du fichier ne doit pas contenir d'espace.");
         return;
      }

      let folder;
      let relativeFolder;
      if (fileID.lastIndexOf('//') != - 1) {
        folder = path.normalize(__dirname+ '/../core/plugins/'+fileID.split('//')[0]);
        relativeFolder = fileID.split('//')[0] + '/';
      } else if  (fileID.lastIndexOf('\\') != - 1) {
        folder =  path.normalize(__dirname+ '/../core/plugins/'+fileID.substring(0, fileID.lastIndexOf('\\')));
        relativeFolder = fileID.substring(0, fileID.lastIndexOf('\\') + 1);
      } else {
        dialog.showErrorBox('Erreur', "Impossible de renommer le fichier");
        return;
      }

      let oldFile = path.normalize(__dirname+ '/../core/plugins/'+fileID);
      let newFile = path.normalize(folder + '/' + file);

      if (fs.existsSync(newFile)) {
        dialog.showErrorBox('Erreur', "Impossible de renommer le fichier "+fileName+"\nLe fichier "+file+" existe déjà.");
        return;
      }

      if (buffers[fileID]) {
          let str = buffers[fileID].getValue();
          fs.writeFile(newFile, str, function (err) {
            if (err) {
              let back = ipcRenderer.sendSync('error', err);
              dialog.showErrorBox('Erreur', "Impossible de renommer le fichier " + fileName);
              return;
            }

            trash(oldFile).then(() => {
                removeTab(fileID);
                if (relativeFolder.indexOf('/\\') != -1) {
                    relativeFolder = relativeFolder.replace(plugin+'/', '');
                    file = relativeFolder+file;
                } else {
                    file = '/'+file;
                }
                openfile (plugin, file);
                setTabfiles(plugin);
            });
          });
        } else {
            fs.copySync(oldFile, newFile);
            trash(oldFile).then(() => {
              setTabfiles(plugin);
            });
        }
    }
  }

  document.getElementById('x-buttons-cancel-rename-file').addEventListener('click',  _cancel);
  document.getElementById('x-buttons-done-rename-file').addEventListener('click', _done);

  document.getElementById("label-file").innerHTML = "Entrez le nouveau nom du fichier:";
  document.getElementById("wrapper").style.display = "block";
  document.getElementById("wrapper").style.visibility = "visible";

  let fileName;
  if (fileID.lastIndexOf('//') != - 1)
    fileName = fileID.split('//')[1];
  else if  (fileID.lastIndexOf('\\') != - 1)
    fileName =  fileID.substring(fileID.lastIndexOf('\\') + 1);
  else
    fileName = fileID;
  document.getElementById("textbox-file").value = fileName;

  document.getElementById("done-rename-file").innerHTML = "Renommer";
  document.getElementById("cancel-rename-file").innerHTML = "Annuler";

}



function handleDeleteButton (plugin, fileID, folder, callback) {

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);
  let file = path.normalize(__dirname+ '/../core/plugins/'+fileID);
  let tts = (!folder)   ? "Voulez-vous vraiment supprimer le fichier ?" :
            (!callback) ? "Voulez-vous vraiment supprimer le répertoire ?"
                        : "Voulez-vous vraiment supprimer le plugin ?";

  dialog.showMessageBox(win, {
      type: 'question',
      title: 'Avatar',
      message: tts,
      detail: "Vous supprimez: \n"+file,
      buttons: ['Déplacer dans la corbeille', 'Annuler']
  }, function(response) {
    switch (response) {
      case 0:
          trash(file).then(() => {
              if (!folder && buffers[fileID]) removeTab(fileID);
              if (!callback) setTabfiles(plugin);
              if (callback) callback();
          });
    }
  });

}



function handleSaveAsButton (plugin, fileID) {
  let oldFile = path.normalize(__dirname+ '/../core/plugins/'+fileID);
  let options = {
    title: "Sauvegarder sous...",
    defaultPath: oldFile
  };

  let id = ipcRenderer.sendSync('infoPlugins', 'id');
  let win = BrowserWindow.fromId(id);

  dialog.showSaveDialog(win, options, function (file) {
    if (file) {
      if (file.indexOf(' ') != -1) {
         dialog.showErrorBox('Erreur', "Le nom du fichier ne doit pas contenir d'espace.");
         return;
      }

      if (buffers[fileID]) {
        let str = buffers[fileID].getValue();
        fs.writeFile(file, str, function (err) {
          if (err) {
            let back = ipcRenderer.sendSync('error', err);
            dialog.showErrorBox('Erreur', "Le fichier " + file.substring(file.lastIndexOf('\\') + 1) + " n'a pas été sauvegardé");
            return;
          }
          setTabfiles(plugin);
        });
      } else {
        fs.copySync(oldFile, file);
        setTabfiles(plugin);
      }
    }
  });

}



function handleSaveButton(fileID, callback, saveByMenu) {

  let str, closed;
  if (!fileID) {
     fileID = getActiveDocument();
     if (buffers[fileID].isClean(isClean[fileID].generation)) {
          return;
     }
   } else
     if (!saveByMenu) closed = true;

  str = buffers[fileID].getValue();

  let tts;
  if (fileID.lastIndexOf('//') != - 1)
    tts = fileID.split('//')[1];
  else if  (fileID.lastIndexOf('\\') != - 1)
    tts =  fileID.substring(fileID.lastIndexOf('\\') + 1);
  let notification = document.getElementById('notification');

  let file = path.normalize(__dirname+ '/../core/plugins/'+fileID);
  fs.writeFile(file, str, function (err) {
    if (err) {
      let back = ipcRenderer.sendSync('error', err);
      dialog.showErrorBox('Erreur', (tts) ? "Le fichier " + tts + " n'a pas été sauvegardé" : "Le fichier n'a pas été sauvegardé");
      if (callback) callback(false);
      return;
    }

    notification.innerHTML = (tts) ? "Fichier " + tts + " sauvegardé" : "Fichier sauvegardé";
    notification.opened = true;

    if (!closed) {
      isClean[fileID].generation = buffers[fileID].changeGeneration();
      setTabIcon(fileID, false);
    }
    if (callback) return callback(true);
  });
}


function readFileIntoEditor(file) {

  return fs.readFileSync(file, 'utf8');

}


function openDevTools () {
  let id = ipcRenderer.sendSync('infoPlugins', 'mainID');
  let win = BrowserWindow.fromId(id);
  win.openDevTools();
}


function insertToEditor (func) {

  let fileID = getActiveDocument();
  let doc = buffers[fileID];
  let funcfile = fs.readFileSync('./resources/app/lib/create_modules/function/'+scriptVer+'/'+((scriptComment)? 'comment/': 'no_comment/')+func+'.func', 'utf8');
  doc.replaceSelection(funcfile);

}

let scriptVer;
let scriptComment;
function menuEditor () {

  if (!scriptVer) {
    let scriptInfos = fs.readJsonSync('./resources/app/lib/create_modules/function/function.prop', { throws: false });
    scriptVer = scriptInfos.scriptVer;
    scriptComment = scriptInfos.scriptComment;
  }

  let codeMenu = [
    {
        label: 'Sauvegarder   [CTRL-S]',
        icon: 'resources/app/images/icons/save.png',
        click: () => {handleSaveButton()},
    },
    {type: 'separator'},
    {
        label: 'Version de JavaScript',
        icon: 'resources/app/images/icons/js.png',
        submenu : [
                    {
                        label: 'ES5',
                        type: 'checkbox',
                        checked: (scriptVer == 'ES5') ? true : false,
                        click: () => {
                          let scriptInfos = fs.readJsonSync('./resources/app/lib/create_modules/function/function.prop', { throws: false });
                          scriptVer = scriptInfos.scriptVer = 'ES5';
                          fs.writeJsonSync('./resources/app/lib/create_modules/function/function.prop', scriptInfos);
                        }
                    },
                    {
                        label: 'ES6',
                        type: 'checkbox',
                        checked: (scriptVer == 'ES6') ? true : false,
                        click: () => {
                          let scriptInfos = fs.readJsonSync('./resources/app/lib/create_modules/function/function.prop', { throws: false });
                          scriptVer = scriptInfos.scriptVer = 'ES6';
                          fs.writeJsonSync('./resources/app/lib/create_modules/function/function.prop', scriptInfos);
                        }
                    }
                  ]
    },
    {
        label: 'Commentaires',
        type: 'checkbox',
        checked: scriptComment,
        click: () => {
          let scriptInfos = fs.readJsonSync('./resources/app/lib/create_modules/function/function.prop', { throws: false });
          scriptComment = scriptInfos.scriptComment = !scriptComment;
          fs.writeJsonSync('./resources/app/lib/create_modules/function/function.prop', scriptInfos);
        }
    },
    {
        label: 'Insérer...',
        submenu :
        [
          {
             label: 'Variables',
             submenu :
             [
                 {
                     label: 'Config.modules',
                     click: () => {insertToEditor('modules')}
                 },
                 {
                     label: 'currentRoom',
                     click: () => {insertToEditor('currentRoom')}
                 }
            ]
          },
          {
            label: 'Dialogues',
            submenu :
            [
                  {
                      label: 'Speak sans callback',
                      click: () => {insertToEditor('speak')}
                  },
                  {
                      label: 'Speak avec callback',
                      click: () => {insertToEditor('speak-callback')}
                  },
                  {
                      label: 'Speak avec callback end() (Réactive l\'écoute du client)',
                      click: () => {insertToEditor('speak-reactive')}
                  },
                  {type: 'separator'},
                  {
                      label: 'Askme() avec grammaire fixe',
                      click: () => {insertToEditor('askme-fixe')}
                  },
                  {
                      label: 'Askme() avec grammaire générique',
                      click: () => {insertToEditor('askme-generic')}
                  }
            ]
          },
          {
             label: 'Réactiver l\'écoute',
             submenu :
             [
                   {
                     label: 'end()',
                     click: () => {insertToEditor('speak-end')}
                   }
            ]
          },
          {
              label: 'Exécuter une action de plugin',
              submenu :
              [
                    {
                        label: 'run()',
                        submenu :
                        [
                            {
                                label: 'run sans callback',
                                click: () => {insertToEditor('run')}
                            },
                            {
                                label: 'run avec callback',
                                click: () => {insertToEditor('run-callback')}
                            }
                        ]
                    },
                    {
                        label: 'call()',
                        submenu :
                        [
                            {
                                label: 'call sans callback',
                                click: () => {insertToEditor('call')}
                            },
                            {
                                label: 'call avec callback',
                                click: () => {insertToEditor('call-callback')}
                            }
                        ]
                    },
                    {type: 'separator'},
                    {
                        label: 'trigger()',
                        click: () => {insertToEditor('trigger')}
                    },
                    {
                        label: 'listen()',
                        click: () => {insertToEditor('listen')}
                    }
              ]
            },
            {
               label: 'Exécuter une règle',
               submenu :
               [
                 {
                      label: 'ia.action()',
                      submenu :
                      [
                          {
                              label: 'ia.action sans callback',
                              click: () => {insertToEditor('ia.action')}
                          },
                          {
                              label: 'ia.action avec callback',
                              click: () => {insertToEditor('ia.action-callback')}
                          }
                      ]
                  }
              ]
            },
            {
               label: 'Répeter une règle',
               submenu : [
                  {
                      label: 'last()',
                      click: () => {insertToEditor('last')}
                  }

                ]
            },
            {
               label: 'Actions sur les clients',
               submenu :
               [
                 {
                    label: 'Le client est mobile ?',
                    submenu : [
                            {
                                label: 'isMobile()',
                                click: () => {insertToEditor('isMobile')}
                            }
                    ]
                  },
                  {
                    label: 'Le client existe ?',
                    submenu : [
                           {
                             label: 'exists()',
                             click: () => {insertToEditor('exists')}
                           }
                    ]
                  },
                  {
                    label: 'Nom de client dans la règle ?',
                    submenu : [
                        {
                            label: 'clientFromRule()',
                            click: () => {insertToEditor('clientFromRule')}
                        }
                      ]
                  },
                  {
                    label: 'Connaitre le client réel d\'un client mappé ?',
                    submenu : [
                      {
                          label: 'mapClient()',
                          click: () => {insertToEditor('mapClient')}
                      }
                    ]
                  },
                  {
                    label: 'Le son est redirigé pour le client ?',
                    submenu : [
                            {
                              label: 'isServerSpeak()',
                              click: () => {insertToEditor('isServerSpeak')}
                            }
                    ]
                  },
                  {
                       label: 'Les clients connectés',
                       submenu : [
                              {
                                  label: 'getClients()',
                                  click: () => {insertToEditor('getClients')}
                              },
                              {
                                  label: 'getClientSocket()',
                                  click: () => {insertToEditor('getClientSocket')}
                              }
                        ]
                  },
                  {
                         label: 'Exécuter une action direct sur un client',
                         submenu : [
                              {
                                  label: 'remote()',
                                  submenu : [
                                      {
                                          label: 'remote sans callback',
                                          click: () => {insertToEditor('remote')}
                                      },
                                      {
                                          label: 'remote avec callback',
                                          click: () => {insertToEditor('remote-callback')}
                                      }
                                  ]
                              }
                        ]
                    },
                    {
                           label: 'Copier un fichier sur un client',
                           submenu : [
                              {
                                  label: 'copyfile()',
                                  submenu : [
                                      {
                                          label: 'copyfile sans callback',
                                          click: () => {insertToEditor('copyfile')}
                                      },
                                      {
                                          label: 'copyfile avec callback',
                                          click: () => {insertToEditor('copyfile-callback')}
                                      }
                                  ]
                              }
                            ]
                    },
                    {
                           label: 'Exécuter une application sur un client',
                           submenu : [
                              {
                                  label: 'runApp()',
                                  submenu : [
                                      {
                                          label: 'runApp sans callback',
                                          click: () => {insertToEditor('runApp')}
                                      },
                                      {
                                          label: 'runApp avec callback',
                                          click: () => {insertToEditor('runApp-callback')}
                                      }
                                  ]
                              }
                            ]
                    },
                    {
                       label: 'Audio sur un client',
                       submenu : [
                          {
                             label: 'Lire un fichier audio',
                             submenu : [
                               {
                                   label: 'play()',
                                   submenu : [
                                       {
                                           label: 'play sans callback',
                                           click: () => {insertToEditor('play')}
                                       },
                                       {
                                           label: 'play avec callback',
                                           click: () => {insertToEditor('play-callback')}
                                       }
                                   ]
                                 }
                             ]
                           },
                           {
                           label: 'Stopper la lecture du fichier audio',
                           submenu : [
                               {
                                   label: 'stop()',
                                   click: () => {insertToEditor('stop')}
                               }
                             ]
                           },
                           {
                           label: 'Pause la lecture du fichier audio',
                           submenu : [
                               {
                                   label: 'pause()',
                                   click: () => {insertToEditor('pause')}
                               }
                             ]
                           }
                         ]
                       }
                  ]
              }
          ]
    },
    {type: 'separator'},
    {
        label: 'Documentation',
        icon: 'resources/app/images/icons/help.png',
        click: () => {
          let docDev = path.normalize (__dirname + '/../documentation/development/index.html');
          shell.openExternal('file://'+docDev);
        }
    }
  ];
  //android.enableR8 = true
  var handler = function (e) {
    e.preventDefault();
    menu.popup({window: remote.getCurrentWindow()});
    window.removeEventListener('contextmenu', handler, false);
  }

  const menu = Menu.buildFromTemplate(codeMenu);
  window.addEventListener('contextmenu', handler, false);
  return false;
}




function setCMEditor() {

  if (!editor) {
    let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });
    document.getElementById("l-theme-status").innerHTML = 'Theme: ';
    document.getElementById("x-theme-status").innerHTML = pluginProps.plugins.codemirror.theme;

    editor = CodeMirror(
      document.getElementById("editor"),
      {
        mode: { name: "javascript", json: true, globalVars: true},
        inputStyle: "contenteditable",
        lineNumbers: true,
        autoCloseBrackets: true,
        autoCloseTags: true,
        lineWrapping: false,
        styleActiveLine: true,
        foldGutter: true,
        highlightSelectionMatches: false,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        theme: pluginProps.plugins.codemirror.theme,
        indentUnit: 4,
        extraKeys: {
          "Cmd-S": function(instance) { handleSaveButton() },
          "Ctrl-S": function(instance) { handleSaveButton() },
          "F11": function(instance) { openDevTools() },
          "Ctrl-Space": "autocomplete",
          "Ctrl-F": "findPersistent",
          "F10": function(cm) {
            let state = cm.getOption("fullScreen");
            cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            fullscreen(!state);
          },
          "Esc": function(cm) {
            if (cm.getOption("fullScreen")) {
              cm.setOption("fullScreen", false);
              fullscreen(false);
            }
          }
        }
      });

      editor.display.wrapper.style.fontSize =  (pluginProps.plugins.codemirror.fontSize).toString()+"px";
      onresize();

      CodeMirror.on(editor, "change", function() {
            let currentTabID = getActiveDocument();

            if (!editor.isClean(isClean[currentTabID].generation)) {
               setTabIcon(currentTabID, true);
            } else {
                setTabIcon(currentTabID, false);
            }
      });

      editor.on('contextmenu', function (event) {
          menuEditor();
      });

      CodeMirror.on(editor, "cursorActivity", function() {
            let pos = editor.getCursor();
            document.getElementById("posline-status").innerHTML = (pos.line+1).toString()+':'+(pos.ch).toString();
      });

  }
}



function handleDocumentChange(fileID, mode) {

  if (fileID) {
    if (fileID.indexOf('//') != -1) {
      document.getElementById("plugin-status").innerHTML = fileID.split('//')[0];
      document.getElementById("file-status").innerHTML = fileID.split('//')[1];
    }  else {
      document.getElementById("plugin-status").innerHTML = fileID.split('/\\')[0];
      document.getElementById("file-status").innerHTML = fileID.split('\\')[fileID.split('\\').length - 1];
    }
    if (mode) {
      editor.setOption("mode", mode.mime);
      CodeMirror.autoLoadMode(editor, mode.mode);
      document.getElementById("mode-status").innerHTML = mode.mime;
    }
    let pos = buffers[fileID].getCursor();
    document.getElementById("posline-status").innerHTML = (pos.line+1).toString()+':'+(pos.ch).toString();

    if (document.getElementById('x-theme-status').innerHTML == '') {
      let pluginProps = fs.readJsonSync('./resources/app/interface.prop', { throws: false });
      document.getElementById("l-theme-status").innerHTML = 'Theme: ';
      document.getElementById("x-theme-status").innerHTML = pluginProps.plugins.codemirror.theme;
    }

    document.getElementById("font-size").style.visibility = "visible";

  } else {
    document.getElementById("plugin-status").innerHTML = "";
    document.getElementById("file-status").innerHTML = "";
    document.getElementById("mode-status").innerHTML = "";
    document.getElementById("posline-status").innerHTML = "";
    document.getElementById("l-theme-status").innerHTML = "";
    document.getElementById("x-theme-status").innerHTML = "";
    document.getElementById("font-size").style.visibility = "hidden";
  }

}


onload = function() {
  Config = ipcRenderer.sendSync('infoPlugins', 'getConfig');
  addCYCreatePlugin();
  walkToPlugins();
}


onresize = function() {
  if (editor) editor.refresh();
}
