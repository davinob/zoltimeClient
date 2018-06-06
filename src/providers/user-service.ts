

import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { AngularFireAuth } from 'angularfire2/auth';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { Subscription } from 'rxjs/Subscription';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument} from 'angularfire2/firestore';
  import { Position, Address, AddressService } from './address-service';
  
  import * as firebase from 'firebase/app';
  
  

  import { Subject } from 'rxjs/Subject';
  

  import { AuthService } from './auth-service';
  
  import { GlobalService } from './global-service';

  import { HttpClient, HttpParams } from '@angular/common/http';

  import { from } from 'rxjs/observable/from';

  
  
export interface Seller {
  email: string;
  address?:Address;
  profileCompleted?:boolean;
  products?:Array<Product>;
  promotions?:Array<Promotion>;
  restaurantName:string;
  description:string;
  telNo:string;
  distanceFromPosition:number;
  hasAtLeastOnePromo:boolean;
  key:string;
  category:string;

  }

  export interface User {
    email: string;
    profileCompleted?:boolean;
    authenticated?:boolean
    }



export interface Product{
  name: string,
  description: string,
  quantity?: number,
  currentQuantity?:number,
  originalPrice: number,
  reducedPrice?: number,
  key:string,
  uID:string,
  discount?:number,
  enabled?:boolean,
  isPreviouslyChosen?:boolean,
  bestPromo?:any
}

export interface Promotion{
  name: string,
  products:Array<Product>,
  isOneTime:boolean,
  promotionStartTime:string,
  promotionEndTime:string,
  days?:{},
  date?:Date,
  key?:string,
  uID?:string,
  isActivated:boolean
}


export interface SearchSettings {
  position:Position;
  hashgaha: string;
  range:number;
  onlyShowPromotion:boolean
  }

@Injectable()
export class UserService {

  db=firebase.firestore();
  
  usersCollection: AngularFirestoreCollection<Seller>;
  sellersCollectionRef: firebase.firestore.CollectionReference;
  productsCollection:firebase.firestore.CollectionReference;
  promotionsCollection:firebase.firestore.CollectionReference;
  currentUser:User={email:"unset",
                    authenticated:false};
  userStatus:Subject<any>=new Subject<any>();
   
  currentUserObs:Observable<any>=null;
  
  userProducts:Array<any>=[];
  userPromotions:Array<any> = [];
  
  allSellers:Array<any>=[];
  allSellersFiltered:Array<any>=[];

  

  lookingForProducts:Subject<boolean>=new Subject();
  doneLookingForSellers:Subject<boolean>=new Subject();

  

  constructor(private afs: AngularFirestore,public authService:AuthService,
   private http: HttpClient,
    private globalService:GlobalService,
  private addressService:AddressService) {
      this.usersCollection = this.afs.collection('users'); 
        this.sellersCollectionRef = this.db.collection('sellers');
     
        this.getAllSellers();
      }


      public getAllSellers()
      {
        this.doneLookingForSellers.next(false);
        this.sellersCollectionRef.get().then(sellersInfos =>
          {

            if (!sellersInfos || sellersInfos.empty)
            {
              return;
            }
      
            sellersInfos.forEach(doc=>{
              
              let uid=doc.id;
            let seller=doc.data();  
            seller.key=uid;

             this.allSellers.push(seller);
             this.allSellersFiltered.push(seller);
           });
           
          }).then(()=>{
            this.doneLookingForSellers.next(true);
          }).catch(error=>{
            console.log(error);
            this.doneLookingForSellers.next(true);
      
      
          });
      }


      public getSellerOfKey(sellerKey:string):Seller{
        
        if (!this.allSellers)
        return null;

        for (let index = 0; index < this.allSellers.length; index++) {
          const seller:Seller = this.allSellers[index];
          if (seller.key==sellerKey)
          return seller;
        }

        return null;
      }

   public  updateUserAuthConnected(flag:boolean)
   {
    this.currentUser.authenticated=flag;

   }


   public initCurrentUser(userID:string):Observable<any>
   {
     console.log("init with userID:"+userID);
         this.globalService.userID=userID;
         
         this.currentUserObs=this.usersCollection.doc(this.globalService.userID).valueChanges();
         
        this.currentUserObs.subscribe(data =>
         { 
           this.setCurrentUserData(data);
         });
 
        
 
         return this.userStatus.asObservable().first(data=>data!=null);
   }

  
  

  public setCurrentUserData(data:any)
  {
    this.currentUser=data;

    
  }

  filterSellersAndGetTheirProdsAndDeals(settings:SearchSettings)
{
  this.lookingForProducts.next(true);

  this.allSellersFiltered=new Array();

  console.log("queryAllBasedOnFilters");
  if (!settings.position.geoPoint)
  {
    console.log("NO LOCATION");
    this.lookingForProducts.next(false);
    return;
  }

  this.allSellersFiltered=this.allSellers.filter((seller) => {
      let validSeller:boolean=true;

      if (settings.hashgaha != "Any") {
         validSeller=validSeller && seller.hashgaha[settings.hashgaha];
      }

      validSeller=validSeller && this.addressService.isGeoPointNotSoFar(seller.address.geoPoint,settings.position.geoPoint,settings.range);
    
      return validSeller;

    });
    

    if (!this.allSellersFiltered || this.allSellersFiltered.length==0) 
    {
      this.lookingForProducts.next(false);
      return;
    }

    this.allSellersFiltered.forEach(seller=>{
      this.lookingForProducts.next(true);
    
        let distance=this.addressService.distance(seller.address.geoPoint,settings.position.geoPoint);
        distance=Math.round(distance*100)/100;
        console.log("DISTANCE:" +distance);
       seller.distanceFromPosition=distance;
   
      this.fetchSellerProdsAndProms(seller).then(()=>
      {
        console.log("SELLER IN PROMISE");
        console.log(seller);
        this.lookingForProducts.next(false);
        
      });
 
      
      });

  }


fetchSellerProdsAndProms(seller:any):Promise<any>
{
  console.log("SELLER before return PROMISE");
let promiseProducts:Promise<any>=this.sellersCollectionRef.doc(seller.key).collection("products").get().then(
    productsInfo =>
    { 
      seller.products=new Array();
        console.log("PRODUCTS");
     
     
        productsInfo.forEach(product=>{
          seller.products.push(product.data());
        });
      });

  let promisePromotions=this.sellersCollectionRef.doc(seller.key).collection("promotions").get().then(
          promotionsInfo =>
          { 
            seller.promotions=new Array();
              console.log("PROMOTIONSSS");
           
              promotionsInfo.forEach(promotion=>{
                seller.promotions.push(promotion.data());
              });
          });

      return Promise.all([promiseProducts,promisePromotions]).then(()=>
        {
          console.log("SELLER before return PROMISE 1");
          this.findAndSetBestPromoForAllProductsOfSeller(seller);
          console.log("SELLER before return PROMISE 2");
        });
}


findAndSetBestPromoForAllProductsOfSeller(seller:any){
  console.log("findAndSetBestPromoForAllProducts:")
 

  
    let hasFoundOnePromo=false;
    seller.products.forEach((product, indexProd)=>
    {
      let lastGoodPromo=null;

      
      if (!seller.promotions)
      { 
        return;
      }
      for(let i=0; i<seller.promotions.length;i++)
      {
        let promo=seller.promotions[i];
        
        if (!promo.isActivated)
        {
          continue;
        }

        let promoTimes=this.calculatePromotionMessage(promo);
        if (promoTimes.notValid)
        {
          continue;
        }
        
        for (let prodKey in promo.products)
        {
          let prodPromo=promo.products[prodKey];
          if (!prodPromo)
          continue;

        
          if (prodKey==product.key)
          {
            console.log("PRICE COMPARISONS");
            if (lastGoodPromo)
            {
            console.log(prodPromo.reducedPrice+"vs"+lastGoodPromo.price);
            }

            if (lastGoodPromo==null ||(prodPromo.reducedPrice<lastGoodPromo.price)&&(prodPromo.currentQuantity>0))
            {
              hasFoundOnePromo=true;
              lastGoodPromo={price:prodPromo.reducedPrice,
                            quantity:prodPromo.currentQuantity,
                            name:promo.name,
                            promoTimes:promoTimes};

                    console.log("lastGoodPromo:");
                            console.log(lastGoodPromo);
            }
          } 
        }
      }
      seller.products[indexProd].bestPromo=lastGoodPromo;
      });

      seller.promotions=null;
      seller.hasAtLeastOnePromo=hasFoundOnePromo;
 
  }


   public getCurrentUser():User
  {
    return this.currentUser;
  }

  public getUserProducts():Array<any>
  {
    return this.userProducts;
  }


  public getUserProductsClone():Array<any>
  {
    return Object.assign([], this.userProducts);
  }

  public getUserPromotions():Array<any>
  {
    return this.userPromotions;
  }
  
 

  public isProfileCompleted():boolean
  {
    if (this.currentUser==null)
     return false;
    return this.currentUser.profileCompleted==true;
  }
  
  public createUser(userUID:string, email:string, restaurantName:string):Promise<any>
  {
  
   let user:User={
      email: email
      
    };
   console.log("creating user on UID"+userUID);
    
     return new Promise<any>((resolve, reject) => {
      let setUserPromise:Promise<void>=this.usersCollection.doc(userUID).set(user);
      console.log("PROMISE launched");
      setUserPromise.then( ()=>
      {
        console.log("PROMISE DONE");
      }
    ).catch( (error)=>
    {
      console.log(error);
    });
       resolve(setUserPromise);
    
  });

}


searchAddressesAndSellers(searchTerm:string):Promise<any>
{
  return new Promise((resolve,reject)=>{
    let sellersNames=this.getAllSellersWithSearchTerm(searchTerm);
    this.addressService.searchAddresses(searchTerm).then(addresses=>{
      console.log("SEARCHED ADDRESSES");
     
      let sellersAndAddresses=new Array();

      sellersAndAddresses=sellersAndAddresses.concat(sellersNames,addresses);
      console.log(sellersAndAddresses);
        resolve(sellersAndAddresses);
    });
    
  
  
  
    console.log(sellersNames);


  });




}

getAllSellersWithSearchTerm(searchTerm:string)
{
  let sellers=new Array();
  if (!this.allSellers || this.allSellers.length==0)
  {
    return sellers;
  }

  this.allSellers.filter(seller=>{
    let sellerName:string=seller.restaurantName;
    return sellerName.toLocaleLowerCase().indexOf(searchTerm.toLocaleLowerCase())>=0;
  }).forEach((seller)=>{
  sellers.push({description:seller.restaurantName,address:seller.address.description,key:seller.key,isAddress:false});
  });

  return sellers;
}


calculatePromotionMessage(promo:Promotion):any
{
      let nowDate=new Date();
      let promotionHasStarted=false;
      let datesCalculated=this.calculatePromoStartEndDates(promo,false);
      let startDate:Date=datesCalculated.startDate;
      let endDate:Date=datesCalculated.endDate;

     
      let timeDiffInSecBeforeStart=Math.round((startDate.valueOf()-nowDate.valueOf())/1000);
      let timeDiffInSecBeforeEnd=Math.round((endDate.valueOf()-nowDate.valueOf())/1000);

      if (timeDiffInSecBeforeEnd>(15 * 3600)) //limit to next 15 hours
      {
        return {start:"",notValid:true};
      }

      let timeDiffInSec=timeDiffInSecBeforeStart;
      if (timeDiffInSecBeforeStart<=0)
      {
        promotionHasStarted=true;
        timeDiffInSec=Math.round( (endDate.valueOf()-nowDate.valueOf())/1000);
        
        if (timeDiffInSec<0)
        {
          return {start:"",notValid:true};
        }
          
      }
    
      let promoTimes={start:"", end:"",notValid:false,hasStarted:false};
     
        promoTimes.hasStarted=true;

      promoTimes.end+=this.formT(endDate.getHours())+":"+this.formT(endDate.getMinutes());
      promoTimes.start+=this.formT(startDate.getHours())+":"+this.formT(startDate.getMinutes());
   
    
      return promoTimes;
}





calculatePromoStartEndDates(promo:Promotion, checkForNext:boolean):any
{
  let nowDate=new Date();

  let startDate:Date;
  let endDate:Date;

  let startH=Number.parseInt(promo.promotionStartTime.substr(0,2));
  let startM=Number.parseInt(promo.promotionStartTime.substr(3,2));

   
  let endH=Number.parseInt(promo.promotionEndTime.substr(0,2));
  let endM=Number.parseInt(promo.promotionEndTime.substr(3,2));

  if (!promo.isOneTime)
  {

    let daysToAddToToday=-1;


    if (((startH>endH)||((startH==endH)&&((startM>endM)))) //promotion not in same day
      && 
      ((nowDate.getHours()<endH)||((nowDate.getHours()==endH)&&((nowDate.getMinutes()<endH))))
      )
    {
      nowDate=new Date(nowDate.valueOf()-(1000 * 60 * 60 * 24))
    }

    let nowD:number=nowDate.getDay();
    
    let i=-1;
    
    if (checkForNext)
    {
      i=0;
    }

    
 
   
    while (i<=7 && daysToAddToToday==-1)
    {
  
      if (promo.days[(nowD+i)%7+1])
      {
        daysToAddToToday=i+1;
      }
      i++;
    }
  
    startDate=new Date(nowDate.valueOf()+(daysToAddToToday*1000 * 60 * 60 * 24));
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    endDate=new Date(startDate);

  }
  else
  {
    startDate=new Date(promo.date);
    endDate=new Date(promo.date);
  }
    
   
    startDate.setHours(startH);
    startDate.setMinutes(startM);
  
  
   endDate.setHours(endH);
   endDate.setMinutes(endM);
  
  if ((startH>endH)||((startH==endH)&&((startM>endM)))) //promotion not in same day
  {
   
    endDate=new Date(endDate.valueOf()+(1000 * 60 * 60 * 24));
   
  }

  if ((!promo.isOneTime)&&(!checkForNext)&&(Math.round( endDate.valueOf()-nowDate.valueOf())<0))
      return this.calculatePromoStartEndDates(promo,true);
  

  return {startDate:startDate,endDate:endDate};
  
}










formT(num:number):string
{
   if (num.toString().length==1)
    return "0"+num;
  return num+"";
}





/*
//readonly START_PROMOTION_URL = 'https://us-central1-zoltime-77973.cloudfunctions.net/startPromotion';
//readonly STOP_PROMOTION_URL = 'https://us-central1-zoltime-77973.cloudfunctions.net/stopPromotion';
public stopTodayPromotion():Promise<any>
{

  this.currentUser.promotionStartDateTime=null;
  this.currentUser.promotionEndDateTime=null;
  this.timerSubscription.unsubscribe();

  return new Promise<any>((resolve, reject) => {
    
        let myHeaders = new HttpHeaders({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
       let message={userID:this.globalService.userID};
        console.log("STOP PROMOTION!!");
        console.log(message);
        let obsPost=this.http.post(this.STOP_PROMOTION_URL,message,{headers:myHeaders}).subscribe(
          data => {
          //  alert('ok');
          },
          error => {
            console.log(error);
          }
        );
    
        resolve(obsPost);
     
      });


}

public startTodayPromotion():Promise<any>
{
  console.log("START PROMOTION");
  this.startPromotionTimer();

  return new Promise<any>((resolve, reject) => {

    let myHeaders = new HttpHeaders({'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    
    console.log(this.currentUser.promotionStartDateTime);
    console.log(this.currentUser.promotionEndDateTime);
    
    let message={userID:this.globalService.userID,
                startDateTime: this.currentUser.promotionStartDateTime+"",
                 endDateTime: this.currentUser.promotionEndDateTime+"" };
    console.log("START PROMOTION!!");
    console.log(message);
    let obsPost=this.http.post(this.START_PROMOTION_URL,message,{headers:myHeaders}).subscribe(
      data => {
        //alert('ok');
      },
      error => {
        console.log(error);
      }
    );

    resolve(obsPost);
 
  });
}*/
}
