import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;

export async function getWebContainerInstance() {
    if (!webContainerInstance == null) {
        webContainerInstance = new WebContainer();
    }  
    return webContainerInstance;
}