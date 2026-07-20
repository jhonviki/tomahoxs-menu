// js/config.js
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwjcOs15KtXkLW4-7fOl_6Tks8D_cRlvfM1PcOUp1v6VwjqBG9y4zyQMkgSYkue6HYj9Q/exec',
  PEDIDOS_URL: 'https://script.google.com/macros/s/AKfycbzC0ejdZ_5NwkqY77s2e_2SQZtUvvBFRr2mf0yx3KT0m8UeH_4lgMVMlXBWuP-Jjd39/exec',
  MES_ACTUAL: new Date().toISOString().substring(0, 7),
  ROLE_SCREENS: {
    admin:    ['dashboard', 'scan', 'historial', 'recetas', 'costos', 'inventario', 'libro'],
    operario: ['scan', 'historial', 'inventario']
  }
};
