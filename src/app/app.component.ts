import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, MenuController, App, NavController} from 'ionic-angular';


import { UserService } from '../providers/user-service';

import { Storage } from '@ionic/storage';


import { first } from 'rxjs/operators';

 
import { FcmService } from '../providers/fcm-service';
import { ToastController } from 'ionic-angular';

import { SplashScreen } from '@ionic-native/splash-screen';

import { AlertAndLoadingService } from '../providers/alert-loading-service';
import { ProductsPage } from '../pages/products/products';


import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  activePage: any;
  initTime:boolean=true;

  rootPage:any = ProductsPage;
  
  pages: Array<{title: string, component: any, icon: string}>=[
  { title: 'חיפוש', component: ProductsPage, icon:'search' },
  { title: 'מועדפים', component: 'FavoritesPage', icon:'star' },
  
  ];
  

  constructor(public appCtrl:App,public platform: Platform, 
    public userService: UserService,
  private storage: Storage, public fcm: FcmService, 
  public toastCtrl: ToastController, public splashScreen:SplashScreen, 
  public alertSvc:AlertAndLoadingService, public translate: TranslateService,public menuCtrl: MenuController ) {

    this.initApp();
  }


  async setLanguage(lan:string,doReInit:boolean)
  {

    this.userService.chosenLanguage=lan;
    


    this.translate.use(lan);
    this.translate.setDefaultLang(lan);
    
    await this.storage.set("language",lan);

    if (lan=="en"||lan=="fr")
    {
      this.platform.setDir('rtl', false);
      this. platform.setDir('ltr', true);
    }
    if (lan=="he")
    {
      this.platform.setDir('rtl', true);
      this. platform.setDir('ltr', false);
    }

    this.setTextInputsDirection();
    
    
    if (doReInit)
    {
      //this.nav.setRoot(ProductsPage);
      //await  this.appCtrl.getRootNav().setRoot(ProductsPage);
      this.splashScreen.show();
      console.log(this.initialLocRef);
      window.location.replace(this.initialLocRef);
      //window.location=this.initialLoc;
      //window.location.reload();
      this.nav.setRoot(ProductsPage);
    }

  }



  setTextInputsDirection()
  {
     if (this.userService.isRtl()) {
          document.documentElement.style.setProperty("--myDirection", "rtl");
         
        }
        else {
          document.documentElement.style.setProperty("--myDirection", "ltr");
        }
  }

  initialLocRef;

  async initApp(){
    this.initialLocRef=window.location.href;
    console.log("INIT LOC");
    console.log(this.initialLocRef);
    let language=await this.storage.get("language");
    if (!language)
    {
    this.setLanguage("he",false);
    }
    else
    {
      this.setLanguage(language,false);
    }

    
    
    console.log("LANGUAGE SET:"+language);

    if (this.initTime)
  {
    await this.userService.getAllSellers();
    console.log("REDIRECTING TO SIGNED PAGE");

    let stillWaiting=true;
    let cameFromNotif=false;

    try{

    this.fcm.getToken();

   

    let firstNotifPrmise=this.fcm.listenToNotifications().pipe(first()).toPromise().then(notif=>
      {
      if (stillWaiting)
      {
        this.transferToPageWithNotif(notif);
        cameFromNotif=true;
      }

      });

   
    
    

    let promiseWait = new Promise((resolve, reject) => {
    let wait = setTimeout(() => {
        clearTimeout(wait);
        resolve('Promise A win!');
      }, 1000)
    });

    await Promise.race([
      promiseWait,
      firstNotifPrmise
    ]);
    


  }
  catch(error)
{
  console.log(error);
}
stillWaiting=false;

    if (!cameFromNotif)
    {
      let viewed=await this.storage.get('tutoViewed');
   
      console.log("VALUE");
      console.log(viewed);
    /*  if(!viewed)
     {
      this.nav.setRoot('TutorialPage');
      } 
      else
      {*/
       // this.nav.setRoot('ProductsPage');
    /*  }*/
    }

    
    


   await this.platform.ready();

   
      this.splashScreen.hide();
    

  
      // Get a FCM token
     try{

      
      if ( this.fcm.listenToNotifications()) // Listen to incoming messages
        {                   
          this.fcm.listenToNotifications().subscribe((notif)=>this.transferToPageWithNotif(notif));
        }
      
      }
      catch(error)
      {
        console.log(error);
      }

    }


      this.initTime=false;
      this.activePage=this.pages[0]; 
      

  }

 
  transferToPageWithNotif(notif)
  {
    
      console.log("THE NOTIF");
      console.log(notif);

      if(notif.tap){
        console.log("Received in background");
        if (notif.key)
        {
          this.nav.setRoot("SellerPage",{sellerKey:notif.key});
        
          return;
        }

      } else {
        console.log("Received in foreground");
         // this.alertSvc.presentToast({message:notif.body});
      }

  }



  openPage(page) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
    this.activePage=page;
  }
  
  checkActive(page)
  {
    return page == this.activePage;
  }

 
  
}
