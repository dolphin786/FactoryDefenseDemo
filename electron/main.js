const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 900,
    minHeight: 700,
    title: '工厂守卫战',
    // 先隐藏窗口，等页面渲染完再显示，避免白屏和布局闪烁
    show: false,
    backgroundColor: '#0e1015', // 与游戏背景色一致，避免白屏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 加载 Vite 构建产物
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // 页面完全渲染后再显示窗口
  // 'ready-to-show' 在首帧绘制完成后触发，此时 flex 布局已稳定
  win.once('ready-to-show', () => {
    win.show();
    // 显示后再强制触发一次 resize，让 Phaser Scale 重新计算
    const [w, h] = win.getContentSize();
    win.setContentSize(w, h);
  });

  // 生产环境隐藏菜单栏
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
