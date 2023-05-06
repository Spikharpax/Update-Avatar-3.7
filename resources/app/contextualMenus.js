//let Browser = require("./documentation.js").init();
const path = require('path');
const fs = require('fs-extra');
const {shell} = require('electron');
let paddingNodes;

const menus = {
  Serveur : [
        {
            label: 'Réactiver les capteurs de pièce courante',
            icon: 'resources/app/images/icons/unlock.png',
            click: () => {Avatar.Interface.clientAction('unlockRoom')}
        },
        {type: 'separator'},
        {
          label : "Plugins",
          icon  : 'resources/app/images/icons/plugins.png',
          submenu : [
                      {
                          label: 'Plugin Studio',
                          icon: 'resources/app/images/icons/fullscreen.png',
                          click: () => {Avatar.Interface.installedPlugins()}
                      },
                      {
                          label: 'Bibliothèque de plugins',
                          icon: 'resources/app/images/icons/minimize.png',
                          click: () => {Avatar.Interface.librairyPlugins()}
                      },
                      {
                          label: 'Ordonner les plugins',
                          icon: 'resources/app/images/icons/control.png',
                          click: () => {Avatar.Interface.controlPlugins()}
                      }
                    ]
        },
        {type: 'separator'},
        {
            label: 'Libérer les nodes',
            icon: 'resources/app/images/icons/unlock.png',
            click: () => {paddingNodes = Avatar.Interface.setPaddingNodes()}
        },
        {
            label: 'Paramètres...',
            icon: 'resources/app/images/icons/settings.png',
            click: () => {Avatar.Interface.settings()}
        },
        {
          label : "Fenêtre",
          icon  : 'resources/app/images/icons/window.png',
          submenu : [
                      {
                          label: 'Basculer plein écran/fenêtre',
                          icon: 'resources/app/images/icons/fullscreen.png',
                          click: () => {Avatar.Interface.fullscreen()}
                      },
                      {
                          label: 'Minimiser',
                          icon: 'resources/app/images/icons/minimize.png',
                          click: () => {Avatar.Interface.minimize()}
                      }
                    ]
        },
        {
            label : "Aide",
            icon: 'resources/app/images/icons/help.png',
            submenu : [
                {
                    label: 'Documentation',
                    icon: 'resources/app/images/icons/info.png',
                    click: () => {
                      Avatar.Documentation.setStaticPath(path.normalize (__dirname + '/../documentation/Avatar'), () => {
                          let Props = fs.readJsonSync(path.normalize (__dirname + '/../core/Avatar.prop'), { throws: false });
                          shell.openExternal('http://localhost:'+Props.http.port+'/Avatar.html');
                          //Browser.loadBrowser('Documentation Avatar', path.normalize (__dirname + '/../documentation/Avatar/browser.html'));
                      });
                    }
                },
                {
                    label: 'Développement',
                    icon: 'resources/app/images/icons/community.png',
                    click: () => {
                      shell.openExternal('file://'+path.normalize (__dirname + '/../documentation/development/index.html'));
                      //shell.openExternal('https://plus.google.com/communities/112159733427783058159');
                      //  Browser.loadBrowser('Communauté Avatar', path.normalize (__dirname + '/../documentation/Community/browser.html'));
                    }
                }
              ]
        },
        {
            label: 'A propos...',
            icon: 'resources/app/images/icons/info.png',
            click: () => {Avatar.Interface.about()}
        },
        {type: 'separator'},
        {
          label : "Redémarrer",
          icon: 'resources/app/images/icons/restart.png',
          submenu : [
            {
              label: 'Redémarrer le Serveur',
              icon: 'resources/app/images/icons/restart.png',
              click: () => {Avatar.Interface.reload()}
            },
            {
              label: 'Redémarrer tous les Clients',
              icon: 'resources/app/images/icons/restart-clients.png',
              click: () => {Avatar.Interface.reload_all(false, true)}
            },
            {
              label: 'Redémarrer le Serveur et tous les Clients',
              icon: 'resources/app/images/icons/restart-all.png',
              click: () => {Avatar.Interface.reload_all(true, true)}
            }
          ]
        },
        {
            label: 'Quitter',
            icon: 'resources/app/images/icons/close.png',
            submenu : [
              {
                label: 'Quitter le Serveur',
                icon: 'resources/app/images/icons/close.png',
                click: () => {Avatar.Interface.close()}
              },
              {
                label: 'Quitter tous les Clients',
                icon: 'resources/app/images/icons/close-clients.png',
                click: () => {Avatar.Interface.close_all(false, true)}
              },
              {
                label: 'Quitter le Serveur et tous les Clients',
                icon: 'resources/app/images/icons/close-all.png',
                click: () => {Avatar.Interface.close_all(true, true)}
              }
            ]
        },
        {
            label: 'Eteindre le PC',
            icon: 'resources/app/images/icons/shutdown.png',
            submenu : [
              {
                label: 'Eteindre le PC du Serveur',
                icon: 'resources/app/images/icons/shutdown.png',
                click: () => {Avatar.Interface.shutdown_all(true, false)}
              },
              {
                label: 'Eteindre le PC de tous les Clients',
                icon: 'resources/app/images/icons/shutdown-clients.png',
                click: () => {Avatar.Interface.shutdown_all(false, true)}
              },
              {
                label: 'Eteindre le PC du Serveur et tous les Clients',
                icon: 'resources/app/images/icons/shutdown-all.png',
                click: () => {Avatar.Interface.shutdown_all(true, true)}
              }
            ]
        }
    ],
    default : [
          {
              label: 'Active l\'écoute',
              icon: 'resources/app/images/icons/unmute.png',
              click: () => {Avatar.Interface.clientAction('unmute')}
          },
          {
              label: 'Désactive l\'écoute',
              icon: 'resources/app/images/icons/mute.png',
              click: () => {Avatar.Interface.clientAction('mute')}
          },
          {type: 'separator'},
          {
              label: 'Démarre l\'écoute',
              icon: 'resources/app/images/icons/start_micro.png',
              click: () => {Avatar.Interface.clientAction('listen')}
          },
          {
              label: 'Stop l\'écoute',
              icon: 'resources/app/images/icons/stop_micro.png',
              click: () => {Avatar.Interface.clientAction('stop_listen')}
          },
          {type: 'separator'},
          {
              label: 'Fixer comme pièce courante',
              icon: 'resources/app/images/icons/lock.png',
              click: () => {Avatar.Interface.clientAction('lockRoom')}
          },
          {type: 'separator'},
          {
              label: 'Volume sur le PC',
              icon: 'resources/app/images/icons/volume.png',
              click: () => {Avatar.Interface.clientAction('speaker')}
          },
          {type: 'separator'},
          {
              label: 'Paramètres',
              icon: 'resources/app/images/icons/settings.png',
              click: () => {Avatar.Interface.nodeSettings()}
          },
          {type: 'separator'},
          {
              label: 'Redémarrer',
              icon: 'resources/app/images/icons/restart.png',
              click: () => {Avatar.Interface.clientAction('restart')}
          },
          {
              label: 'Quitter',
              icon: 'resources/app/images/icons/close.png',
              click: () => {Avatar.Interface.clientAction('quit')}
          },
          {
              label: 'Eteindre le PC',
              icon: 'resources/app/images/icons/shutdown.png',
              click: () => {Avatar.Interface.clientAction('shutdown')}
          }
      ],
      mobile : [
        {
            label: 'Paramètres',
            icon: 'resources/app/images/icons/settings.png',
            click: () => {Avatar.Interface.nodeSettings(true)}
        }
      ],
      mapped : [
        {
            label: 'Fixer comme pièce courante',
            icon: 'resources/app/images/icons/lock.png',
            click: () => {Avatar.Interface.clientAction('lockRoom')}
        },
        {type: 'separator'},
        {
            label: 'Paramètres',
            icon: 'resources/app/images/icons/settings.png',
            click: () => {Avatar.Interface.nodeSettings(true)}
        }
      ]
}


exports.getMenu = function(id, type) {

  var selected;
  for (var menu in menus) {
    if (menu == id) {
      selected = menus[menu];
      if (id == 'Serveur') {
        selected[4].label = !paddingNodes ? 'Libérer les nodes' : 'Fixer les nodes';
        selected[4].icon = !paddingNodes ? 'resources/app/images/icons/unlock.png' : 'resources/app/images/icons/lock.png';
      }
      break;
    }
  }

  if (!selected && type) {
    for (var menu in menus) {
      if (menu == type) {
        selected = menus[menu];
        break;
      }
    }
  }

  if (!selected) {
    selected = menus.default;
  }
  return selected;
}
