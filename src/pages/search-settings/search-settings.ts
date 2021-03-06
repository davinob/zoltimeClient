import { Component} from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SearchSettings, UserService } from '../../providers/user-service';
import * as globalConstants from '../../providers/globalConstants'; 
import { TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs/operators';
/**
 * Generated class for the SearchSettingsPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */






@IonicPage()
@Component({
  selector: 'page-search-settings',
  templateUrl: 'search-settings.html',
})
export class SearchSettingsPage {

  
  settings:SearchSettings=null;
  previousSearchSettings:SearchSettings=null;

  constructor(public translateService:TranslateService ,public navCtrl: NavController, public navParams: NavParams, public storage:Storage,
    private userService:UserService) {
    console.log('constructor SearchSettingsPage');
    this.settings=this.userService.cloneSettings();
    this.previousSearchSettings=this.userService.cloneSettings();
  
  }

    
    rangeMin:number=0;
    rangeMax:number=60;
    




  ionViewDidLoad() {
    console.log('ionViewDidLoad SearchSettingsPage');
    
   }

 
   getHashgahot()
   {
     return globalConstants.hashgahot;
   }

  
lastTime:number=0;


async updateStorageAndSearch()
{

  await this.setSearchDetails();
  this.lastTime=new Date().getTime();

  setTimeout(
    ()=>{
let now=new Date().getTime();
if (now-this.lastTime>=1000)
{ 
  if (this.areSearchSettingTheSame())
  {
    console.log("SAME SETTINGS");
   return;
  }
  console.log("NOT SAME SETTINGS") ;
  console.log(this.settings) ;

  
  this.storage.set("settings",this.settings);
  this.previousSearchSettings=this.userService.cloneSettings();
  this.userService.filterSellersAndGetTheirProdsAndDeals(this.settings);

}
  },1000);
}


 


   async setSearchDetails()
  {
    let searchDetails="";
   
    if (this.settings.hashgaha!="ללא")
    {
      console.log("HERE HASHGAHA");
      let hash= await this.translateService.get(this.settings.hashgaha).pipe(first()).toPromise();
      searchDetails+=hash ;
    }
    

    if (this.settings.onlyShowPromotion)
    {
      if ((this.settings.hashgaha!="ללא"))
      {
        searchDetails+=", ";
      }
      console.log("HERE DEALS");

      searchDetails+=  await this.translateService.get("רק מבצעים").pipe(first()).toPromise();
    }
    this.userService.searchDetails=searchDetails;

  }



areSearchSettingTheSame():boolean
  {
    

    console.log(this.settings);
    console.log(this.previousSearchSettings);

    if (this.previousSearchSettings==null&&this.settings!=null)
      return false;
   
    if (this.settings.position)
    {
      if (this.settings.position.description!=this.previousSearchSettings.position.description)
      return false;
      if (this.settings.position.geoPoint){
      if (this.settings.position.geoPoint.latitude!=this.previousSearchSettings.position.geoPoint.latitude)
      return false;
      if (this.settings.position.geoPoint.longitude!=this.previousSearchSettings.position.geoPoint.longitude)
      return false;
      }
    }

 
    if (this.settings.hashgaha && this.settings.hashgaha!=this.previousSearchSettings.hashgaha)
     return false;

    if (this.settings.range &&  this.settings.range!=this.previousSearchSettings.range)
      return false;

   if (this.settings.onlyShowPromotion!=this.previousSearchSettings.onlyShowPromotion)
      return false;
   
  
    return true;
  }



}
