
import React, { PureComponent } from "react";
import { db, auth, storageRef, firebase, storage, database } from "./Config/firebase";
import igVideoImg from "./Assets/instagram-video.png";
import igAudioImg from "./Assets/ig-audio.jpeg";
import { toast } from "react-toastify";
import { extraCurseWords } from "./info";
import { confirmAlert } from "react-confirm-alert";
import * as Consts from "./Utilities/Consts";
import * as actionTypes from "./Store/actions/actions";
import { updateSuggestionsListAsync } from "./Store/actions/actionCreators";
import { store } from "./Store/index";
import FilterWords from 'bad-words-plus';
const AppContext = React.createContext();

class AppProvider extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      receivedData: {},
      uid: "",
      currentUser: {},
      isUserOnline: false,
      usersProfileData: [],
      isOpeningPost: false,
      currentPostIndex: { index: 0, id: ""},
      currentPage: "",
      currentChat: {uid: "" , index: 0},
      unfollowModal: {},
      igVideoImg: igVideoImg,
      igAudioImg: igAudioImg,
      searchInfo: { results: [], loading: false },
      reelsProfile: {},
      currentReel: {groupIndex:0, groupId:"", reelIndex: 0, reelId: "" },
      savedUserUid: "",
      healthyStorageConnection: true,
      loadingState: {recievedData: false, uploading: false, liking: false},
      activeOption: {activeIndex: 0, activeID: "Edit_Profile"},
      activeProfileSection: {activeIndex: 0, activeID: "grid"},
      pauseMedia: false,
      currentHour: new Date().getHours(),
    };
  }
  generateNewId = () => `${Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 20)}_${Math.random() * 10}`;
  checkProps = () => {
    //automatically checks for missing properties and adds them with their initial values
    const accountSkeleton = {
        uid: this.state.uid,
        userName: "",
        posts: [],
        followers: [],
        following: [],
        followRequests: {received:[], sent: []},
        messages: [],
        profileInfo: {
          bio: "",
          website: "",
          gender: "Male",
          status: "Single",
          name: "",
          phoneNumber: "",
          birthday: "",
          theme: "lightMode",
          professionalAcc: {
            show: true,
            category: "Just For Fun",
            suggested: true,
            status: true,
            reelsForFollowing: false,
            notificationBell:{state: true, type: "Both"},
            private: false,
            suggNotFollowed: false,
            disableComments: false,
            fontFam: Consts.availableFonts.RALEWAY
          },
          sort:{sortBy: "Random", sortDirection: "Descending", filter: "None"},
          accountCreationDate: new Date(),
          registrationMethod: "email"
        },
        homePosts: [],
        reels: [],
        latestLikedPosts: [],
        savedposts: [],
        stories: [],
        blockList: [],
        notifications: {
          isNewMsg: false,
          isUpdate: false,
          list: [],
        },
        isVerified: false,
        userAvatarUrl: "",
    }
  if(accountSkeleton && Object.keys(accountSkeleton).length > 0 && this.state.receivedData && Object.keys(this.state.receivedData).length > 0 && Object.keys(accountSkeleton)?.some(prop => !Object.keys(this.state.receivedData)?.some(el => el.includes(prop)))){
    const diffs = Object.keys(accountSkeleton).filter(prop => !Object.keys(this.state.receivedData).some(el =>  prop.includes(el)));
    let newDiffsArr = {};
    diffs.forEach(diffProp => {
      newDiffsArr = {...newDiffsArr,[diffProp] :accountSkeleton[diffProp]}
    });
    if(newDiffsArr && typeof newDiffsArr === "object"){
        db.collection(Consts.USERS)
        .doc(this.state.uid)
        .update({
          ...newDiffsArr
        })
    }

  }
}
  updatedReceivedData = (UID, loadAnimation) => {
    return new Promise((resolve, reject) => {
      const recievedAuth = JSON.parse(localStorage.getItem("user"));
      if(!Consts.USERS && (this.state.uid || UID)) {
        reject();
        return;
      };
      loadAnimation && this.mutateLoadingState({key: "receivedData", val: true});
      const unsubscribe = db.collection(Consts.USERS)
          .doc(this.state.uid || UID)
          .onSnapshot((data) => {
            //any fetching overflow? change onSnapshot to get
            const fetchedData = data.data();
            this.setState({
              receivedData: fetchedData,
              ...(UID && (this.state.uid !== UID)) && {uid: UID},
              ...(this.state.loadingState.receivedData) && {loadingState: {...this.state.loadingState, receivedData: false}}
            });
            store.dispatch({type: actionTypes.UPDATE_MY_DATA, payload: { newData: fetchedData, UID}});
            this.checkProps();
            resolve();
          }, (err) => {
            reject(err);
            (this.state.loadingState.receivedData) && loadAnimation && this.mutateLoadingState({key: "receivedData", val: false});
          });
          if((!recievedAuth?.email || !this.state.isUserOnline)){
              unsubscribe();
          }
    });
  };
  updateReelsProfile = (reelsOwnerUid) => {
    const recievedAuth = JSON.parse(localStorage.getItem("user"));
    this.setState({
      savedUserUid: reelsOwnerUid
    });
    return new Promise((resolve, reject) => {
       const unsubscribe = db.collection(Consts.USERS).doc(reelsOwnerUid).onSnapshot((profile) => {
         if(reelsOwnerUid === this.state.savedUserUid){
            this.setState({
              reelsProfile: profile.data()
            })
         }
          resolve(profile.data()); 
        }, (error) => {
          this.notify(error, "error");
          reject();
        })
        if((!recievedAuth?.email || !this.state.isUserOnline)){
          unsubscribe();
        }
    })
   
  }

  updateParts = (
    uid,
    stateBase,
    newState,
    updateAbility,
    withNotifications
  ) => {
    if(uid && newState && Object.values(newState).every((el) => !Object.values(el).forEach(w => w === undefined))){
        if (withNotifications === "") {
            return new Promise((resolve, reject) => {
                db.collection(Consts.USERS)
                  .doc(uid)
                  .update({
                    [stateBase]: newState,
                  })
                  .then((res) => {
                    if (
                      updateAbility === true ||
                      uid === this.state.receivedData?.uid
                    ) {
                      this.updatedReceivedData();
                    }
                    resolve();
                  })
                  .catch((err) => {
                    reject(err.message);
                  });
            });
        } else if(withNotifications && typeof withNotifications === "object" ){
          return new Promise((resolve, reject) => {
            db.collection(Consts.USERS)
              .doc(uid)
              .update({
                [stateBase]: newState,
                notifications: withNotifications,
              })
              .then(() => {
                if (
                  updateAbility === true ||
                  uid === this.state.receivedData?.uid
                ) {
                  this.updatedReceivedData();
                }
                resolve();
              })
              .catch((err) => {
                reject(err.message);
              });
          });
        }
    }else{
      this.notify("An error occurred. Please try again later","error");
    }
  };

  handlePeopleLikes = (
    boolean,
    postID,
    postOwnerId,
    userName,
    userAvatarUrl,
    myId,
    contentURL,
    contentType
  ) => {
    this.mutateLoadingState({key: "liking", val: true});
    return new Promise((resolve, reject) => {
        postOwnerId && db.collection(Consts.USERS)
          .doc(postOwnerId)
          .get()
          .then((items) => {
            this.mutateLoadingState({key: "liking", val: false});
            const {
              posts = [],
              notifications = [],
              blockList = [],
            } = items?.data();
            let unupdatedPosts = posts;
            let unupdatedNoti = notifications;

            let dataCopy = JSON.parse(JSON.stringify(unupdatedPosts));
            let notiCopy = JSON.parse(JSON.stringify(unupdatedNoti));
            const isBlocked = blockList.some(
              (d) => d.blockedUid === this.state.uid
            );
            
            const postIdx = posts?.length > 0 ? (posts.map(p => p.id)?.indexOf(postID)): -1;
            if(postIdx !== -1){
                var likesArr = dataCopy[postIdx].likes;
                function getPeopleIndex() { //delete this and use indexOf instead (with gards !== -1)
                  var currIndex;
                  likesArr.people.find((item, i) => {
                    currIndex = i;
                    return item.id === myId;
                  });
                  return currIndex;
                }
                if (!isBlocked) {
                  if (boolean) {
                    if(!likesArr.people.some(o => o.id === myId)){
                      //handles notifications
                      if(postOwnerId !== myId){
                        notiCopy.isUpdate = true; 
                      }
                      const generatedID = this.generateNewId();
                      if(likesArr?.hasOwnProperty("people")){
                          likesArr.people.unshift({
                            id: myId,
                            userName: userName,
                            notiId: generatedID,
                            userAvatarUrl: userAvatarUrl,
                            date: new Date(),
                          });
                          if(notiCopy?.hasOwnProperty("list")){
                            notiCopy.list.unshift({
                              uid: myId,
                              userName: postOwnerId === myId ? "You" : userName,
                              userAvatarUrl: userAvatarUrl,
                              notiId: generatedID,
                              date: new Date(),
                              contentType,
                              contentURL,
                              type: "like",
                              notiText: `liked your ${contentType} post`,
                            });
                          }

                      }else{
                        this.notify("An unexpected error occurred","error");
                      }
                    }
                  } else if (!boolean) {
                    if(likesArr.people.some(o => o.id === myId)){
                          const currentI = notiCopy.list
                            ?.map((el) => {
                              return el.notiId;
                            })
                            .indexOf(likesArr.people?.[getPeopleIndex()]?.notiId);
                          if (currentI !== -1) {
                            notiCopy.list.splice(currentI, 1);
                          } else {
                            // this.notify("abort 151 error", "error");
                          }
                          if(getPeopleIndex() !== -1){
                              likesArr.people.splice(getPeopleIndex(), 1);
                          }
                    }
                  }
                  likesArr.people = Array.from(
                    new Set(likesArr.people.map((itemId) => itemId.id))
                  ).map((ID) => likesArr.people.find((el) => el.id === ID));

                  notiCopy.list = Array.from(
                    new Set(notiCopy.list.map((itemId) => itemId.notiId))
                  ).map((ID) => notiCopy.list.find((el) => el.notiId === ID));

                  this.updateParts(postOwnerId, "posts", dataCopy, false, postOwnerId !== myId ? notiCopy : "").then(() => {
                    resolve();
                  }).catch(() => {
                    reject("");
                  });

                } else {
                  reject("");
                  this.notify("Liking this user is not allowed", "error");
                }
            }else{
              reject("");
              this.notify("Post may have been deleted by the owner.", "error");
            }
          }).catch((err) => {
            this.mutateLoadingState({key: "liking", val: false});
            reject(err);
            this.notify(err.message || "Failed to like post. Try again later.", "error");
          });
    });

  };
  handleReelsActions(type, info){
      const { boolean, ownerUid, itemIndex, itemId, groupIndex, groupId, userName, userAvatarUrl, comment, contentPath, history } = info;
      if(groupId && ownerUid && itemId){
          db.collection(Consts.USERS)
          .doc(ownerUid)
          .get()
          .then((items) => {
            const {
              reels = [],
              notifications = [],
              blockList = [],
            } = items?.data();
            const myId = this.state.uid;
            let dataCopy = JSON.parse(JSON.stringify(reels));
            let notiCopy = JSON.parse(JSON.stringify(notifications));
            const isBlocked = blockList.some(
              (d) => d.blockedUid === myId
            );
            const checkGroupIndex = dataCopy.map(e => e?.id).indexOf(groupId);
            
            if(checkGroupIndex === groupIndex && checkGroupIndex !== -1){
              
              const checkReelIndex = dataCopy[groupIndex].reelItems?.map(l => l?.id).indexOf(itemId);
              if(checkReelIndex ===  itemIndex && checkReelIndex !== -1){
                
                  const mainBranch = dataCopy[groupIndex]?.reelItems?.[checkReelIndex];
                    if (!isBlocked) {
                      const generatedID = this.generateNewId();
                      const generatedCommentId = this.generateNewId();
                      // LIKE/ UNLIKE
                      if(type === "like"){ 
                        let likesArr = mainBranch?.likes;
                        if (boolean) {
                          if(!likesArr.some(o => o.id === this.state.uid)){
                            //handles notifications
                            notiCopy.isUpdate = true;
                            if(mainBranch?.hasOwnProperty("likes")){
                                likesArr.unshift({
                                id: myId,
                                userName: userName,
                                notiId: generatedID,
                                userAvatarUrl: userAvatarUrl,
                                date: new Date(),
                                ownerUid,
                                reelId: itemId
                              });
                              if(notiCopy?.hasOwnProperty("list")){
                                notiCopy.list.unshift({
                                  uid: myId,
                                  userName: ownerUid === myId ? "You" : userName,
                                  userAvatarUrl: userAvatarUrl,
                                  notiId: generatedID,
                                  date: new Date(),
                                  contentType: "reel",
                                  contentURL: "",
                                  type: "like",
                                  notiText: `liked your reel`,
                                  reelId: itemId
                                });
                              }

                            }else{
                              this.notify("An unexpected error occurred","error");
                            }
                            
                          }
                          
                        } else if (!boolean) {
                          const likeIndex = likesArr.map(f => f.id).indexOf(myId);
                          const notiIndex = likesArr.map(f => f.id).indexOf(ownerUid);
                          if(likeIndex !== -1){
                            if(notiIndex !== -1){
                                const currentI = notiCopy?.list
                                ?.map((el) => {
                                  return el.notiId;
                                })
                                .indexOf(likesArr?.[notiIndex]?.notiId);
                              if (currentI !== -1) {
                                notiCopy.list.splice(currentI, 1);
                              }
                            }
                            
                              likesArr.splice(likeIndex, 1);
                          }
                        
                        }
                          likesArr = Array.from(
                            new Set(likesArr.map((itemId) => itemId?.id))
                          ).map((ID) => likesArr.find((el) => el?.id === ID));
                          
                          notiCopy.list = Array.from(
                            new Set(notiCopy.list.map((itemId) => itemId.notiId))
                          ).map((ID) => notiCopy.list.find((el) => el.notiId === ID));
                          
                          this.updateParts(ownerUid, "reels", dataCopy, false, notiCopy);
                          //COMMENT
                      }else if(type === "comment") {
                        let commentArr = mainBranch?.comments;
                        if(mainBranch.hasOwnProperty("comments")){
                          commentArr.push({
                              comment: comment,
                              uid: myId,
                              userAvatarUrl: userAvatarUrl,
                              userName: userName,
                              postDate: new Date(),
                              reelId: itemId,
                              ownerUid,
                              notiId: generatedID,
                              commentId: generatedCommentId,
                          });
                          notiCopy.isUpdate = true;
                          if(notiCopy?.hasOwnProperty("list")){
                            notiCopy.list.unshift({
                              uid: myId,
                              userName: ownerUid === myId ? "You" : userName,
                              userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                              date: new Date(),
                              notiId: generatedID,
                              contentType: "reel",
                              contentURL: "",
                              notiText: `commented on your reel: ${comment} `,
                              type: "comment",
                              commentId: generatedCommentId,
                            });
                          }
                        
                          this.updateParts(ownerUid, "reels", dataCopy, false, notiCopy);
                        }else{
                          this.notify("An unexpected error occurred","error");
                        }
                        
                      
                      }else if(type === "delete-reel"){
                        const buttons = [
                          {
                            label: "Cancel",
                          },
                          {
                            label: "Delete",
                            onClick: () => {
                              let reelItemsCopy = dataCopy?.[groupIndex]?.reelItems;
                                if (contentPath) {
                                  // deletes post data from database
                                    this.deleteContentFromFB(contentPath, "reels").catch((err) => {
                                      this.notify((err?.message), "error");
                                    });
                                }
                                // deletes group if it's empty
                                if(reelItemsCopy.length <= 1){
                                    dataCopy.splice(groupIndex, 1);
                                    history.goBack();
                                  }else{
                                    reelItemsCopy.splice(checkReelIndex, 1);
                                  }
                              
                                this.updateParts(ownerUid, "reels", dataCopy, true, "");
                                this.notify("Reel deleted");
                            },
                          },
                        ];
                        contentPath ? this.confirmPrompt(
                          "Delete Confirmation",
                          buttons,
                          "Are you sure you want to delete this reel?"
                        ) : this.notify("An error occurred. Please try again later 1.","error");
                      }else if("delete-group"){
                            const saveChanges = () => {
                              dataCopy.splice(groupIndex, 1);
                              this.notify("Reel group deleted");
                              this.updateParts(ownerUid, "reels", dataCopy, true, "");
                              history.goBack();
                            }
                            let reelItemsCopy = dataCopy?.[groupIndex]?.reelItems;
                            const buttons = [
                              {
                                label: "Cancel",
                              },
                              {
                                label: "Delete",
                                onClick: () => {
                                    if(reelItemsCopy.length > 0){
                                      //find a way to make an async for loop
                                            for (let i =0; i<reelItemsCopy.length; i++){
                                                  this.deleteContentFromFB(reelItemsCopy[i]?.contentName, "reels").catch((err) => {
                                                    this.notify(err, "error");
                                                  });
                                              }
                                        saveChanges();
                                      
                                    }else{
                                      saveChanges()
                                    }
                                },
                              },
                            ];
                            this.confirmPrompt(
                              "Delete Confirmation",
                              buttons,
                              "Are you sure you want to delete this entire group?"
                            );                      
                        
                      }
                      
                    } else {
                      this.notify("Liking this user is not allowed", "error");
                    }
              }else{
                  this.notify("An error occurred", "error");
              }
              
            }else{
              this.notify("An error occurred", "error");
            }
            
          });
      }else{
          this.notify("An error occurred. Please try again later2.","error");
      }
  }
  resetAllData() {
    this.setState({
      receivedData: {},
      uid: "",
      currentUser: {},
      isUserOnline: false,
      usersProfileData: [],
      isOpeningPost: false,
      currentPostIndex: { index: 0, id: ""},
      currentPage: "",
      currentChat: {uid: "" , index: 0},
      unfollowModal: {},
      igVideoImg: igVideoImg,
      igAudioImg: igAudioImg,
      searchInfo: { results: [], loading: false },
      reelsProfile: {},
      currentReel: {groupIndex:0, groupId:"", reelIndex: 0, reelId: "" },
      savedUserUid: "",
      healthyStorageConnection: true,
      loadingState: {recievedData: false, uploading: false, liking: false},
      activeOption: {activeIndex: 0, activeID: "Edit_Profile"},
      activeProfileSection: {activeIndex: 0, activeID: "grid"},
      pauseMedia: false,
      currentHour: new Date().getHours(),
    });
  }

  handleSubmittingComments(
    myId,
    userName,
    comment,
    userAvatarUrl,
    postId,
    ownerId,
    contentURL,
    contentType
  ) {
    return new Promise((resolve, reject) => {
        //create an index checker here to make sure this is the correct post to edit
        const generatedCommentId = this.generateNewId();
        if (ownerId === this.state.uid) {
          let myPostsCopy = JSON.parse(
            JSON.stringify(this.state.receivedData.posts)
          );
          const postIDX = myPostsCopy?.length > 0 ? (myPostsCopy.map(d => d.id)?.indexOf(postId)) : -1;
          if(!this.state.receivedData?.profileInfo?.professionalAcc?.disableComments){
            if(postIDX !== -1 && myPostsCopy[postIDX].hasOwnProperty("comments")){
                myPostsCopy[postIDX].comments.push({
                comment: this.cleanseText(comment),
                uid: myId,
                userAvatarUrl: userAvatarUrl,
                userName: userName,
                postDate: new Date(),
                postId: postId,
                ownerId,
                likes: [],
                subComments: [],
                commentId: generatedCommentId,
              });
              this.updateParts(myId, "posts", myPostsCopy, true, "").then(() => {
                  resolve();
              }).catch(() => {
                  reject();
              });
            }else{
              reject();
              this.notify("Post may have been deleted by the owner.","error");
            }
          }else{
            reject();
            this.notify("You have disabled comments. To comment again you have to turn this feature off.","error");
          }
        
        } else if (ownerId && (ownerId !== this.state.uid)) {
          db.collection(Consts.USERS)
            .doc(ownerId)
            .get()
            .then((items) => {
              const {
                posts = [],
                notifications = {},
                blockList = [],
                profileInfo = {}
              } = items?.data();
              let oldPosts = posts;
              let noti = notifications;
              let theirPostsCopy = JSON.parse(JSON.stringify(oldPosts));
              let notiCopy = JSON.parse(JSON.stringify(noti));
              const generatedID = this.generateNewId();

              const postIDX = theirPostsCopy?.length > 0 ? (theirPostsCopy.map(d => d.id)?.indexOf(postId)) : -1;
              const isBlocked = blockList.some(
                (d) => d.blockedUid === this.state.uid
              );
              if (!isBlocked) {
                if(!profileInfo?.professionalAcc?.disableComments){
                  
                    if(postIDX !== -1 && theirPostsCopy[postIDX].hasOwnProperty("comments")){
                        theirPostsCopy[postIDX].comments.push({
                          comment: comment,
                          uid: myId,
                          userAvatarUrl: userAvatarUrl,
                          userName: userName,
                          postDate: new Date(),
                          postId: postId,
                          ownerId: ownerId,
                          likes: [],
                          subComments: [],
                          notiId: generatedID,
                          commentId: generatedCommentId,
                        });
                        notiCopy.isUpdate = true;
                        if(notiCopy?.hasOwnProperty("list")){
                          notiCopy.list.unshift({
                            uid: myId,
                            userName: userName,
                            userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                            date: new Date(),
                            notiId: generatedID,
                            contentURL,
                            contentType,
                            notiText: `commented on your ${contentType} post: ${comment} `,
                            type: "comment",
                            commentId: generatedCommentId,
                          });
                        }

                      this.updateParts(ownerId, "posts", theirPostsCopy, false, notiCopy).then(() => {
                          resolve();
                      }).catch(() => {
                         reject();
                      });
                    }else{
                      reject();
                      this.notify("An unexpected error occurred","error");
                    }
                }else{
                  reject();
                  this.notify("Comments are disabled","error");
                }
              } else {
                reject();
                this.notify(
                  "Submitting a comment to this user is not allowed",
                  "error"
                );
              }
            }).catch(() => {
              reject();
            });
        }
    })
  }

  deleteContentFromFB(path, root) {
    return new Promise((resolve, reject) => {
      path &&
        root &&
        storageRef
          .child(`${root}/${this.state.uid}/${path}`)
          .delete()
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err.message);
          });
    });
  }
  getUsersProfile(uid) {
    const currentUid = uid;
    this.setState({
      ...this.state,
      savedUserUid: uid
    });
    const recievedAuth = JSON.parse(localStorage.getItem("user"));
    if(currentUid){
        return new Promise((resolve, reject) => {
        const unsubscribe = db.collection(Consts.USERS).doc(currentUid).onSnapshot(
            (snapshot) => {
              const data = snapshot?.data();
              // Saving uid in state avoids current account to be switched unexpectedly
              if(data?.uid === this.state.savedUserUid){
                this.setState({
                  ...this.state,
                  usersProfileData: data,
                });
              }
              resolve(snapshot?.data());
            },
            (error) => {
              reject(error);
            }
        );
        if((!recievedAuth?.email || !this.state.isUserOnline)){
          unsubscribe();
        }
      });
    }
   
  }
  updateUserState = (state) => {
    this.setState({
      isUserOnline: state,
    });
  };
  updateUID = (UID) => {
    return new Promise( resolve => {
        this.setState({
            uid: UID,
          }, () => {
           resolve();
          });
    });
  };
  changeMainState = (property, newValue, obj) => {
    return new Promise((resolve) => {
        this.setState({  
          ...(typeof obj === "object") && obj,
          [property]: newValue,
        });
        resolve();
    });

  };

  handleSubComments = (
    commentInfo,
    commentText,
    userAvatarUrl,
    updatingAbility,
    contentURL,
    contentType
  ) => {
    const {
      postId,
      postOwnerId,
      senderUid,
      commentId
    } = commentInfo;
    return new Promise((resolve,reject) => {
      if(postOwnerId){
          db.collection(Consts.USERS)
            .doc(postOwnerId)
            .get()
            .then((items) => {
              const {
                posts = [],
                notifications = {},
                blockList = [],
                profileInfo = {}
              } = items?.data();
              let unupdatedPosts = posts;
              let noti = notifications;
              const postsCopy = JSON.parse(JSON.stringify(unupdatedPosts));
              const notiCopy = JSON.parse(JSON.stringify(noti));
              const isBlocked = blockList.some(
                (g) => g.blockedUid === this.state.uid
              );

              let matchedIndex = postsCopy
                .map((el) => {
                  return el.id;
                })
                .indexOf(postId);
              if (matchedIndex !== -1) {
                const getCommentIndex = postsCopy[matchedIndex]?.comments?.map(j => j.commentId).indexOf(commentId);
                if(getCommentIndex !== -1){
                    if (!isBlocked) {
                      if(!profileInfo?.profileInfo?.professionalAcc?.disableComments){
                          var notiId = this.generateNewId();
                          var generateSubId = this.generateNewId();
                          const subComments =
                            postsCopy[matchedIndex].comments[getCommentIndex].subComments;
                            if(postsCopy[matchedIndex].comments[getCommentIndex]?.hasOwnProperty("subComments")){
                              subComments.push({
                                commentText: commentText,
                                postId: postId,
                                postOwnerId: postOwnerId,
                                senderName: this.state.receivedData?.userName,
                                userAvatarUrl: userAvatarUrl,
                                notiId: notiId,
                                date: new Date(),
                                likes: [],
                                senderUid,
                                subCommentId: generateSubId,
                                commentId: commentId
                              }); 
                              
                              if (postOwnerId !== this.state.uid && notiCopy?.hasOwnProperty("list")) {
                                notiCopy.isUpdate = true;
                                notiCopy.list.unshift({
                                  uid: this.state.uid,
                                  userName:
                                    postOwnerId === this.state.uid
                                      ? "You"
                                      : this.state.receivedData?.userName,
                                  notiId,
                                  contentURL,
                                  contentType,
                                  likes: [],
                                  userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                                  date: new Date(),
                                  notiText: `mentioned you in a comment: ${commentText}`,
                                  type: "sub-comment",
                                  subCommentId: generateSubId,
                                  commentId: commentId
                                });
                              }
                              this.updateParts(
                                postOwnerId,
                                "posts",
                                postsCopy,
                                updatingAbility,
                                notiCopy
                              ).then(() => {
                                  resolve();
                              }).catch(() => {
                                reject();
                              }); 
                            }else{
                              reject();
                              this.notify("An unexpected error occurred","error");
                            }

                        }else{
                          reject();
                          this.notify("Comments are disabled","error");
                        }

                      } else {
                        reject();
                        this.notify(
                          "Submitting a comment to this user is not allowed",
                          "error"
                        );
                      }
                }else{
                  reject();
                  this.notify("Error has occurred. Please try again later.", "error");
                }
              } else {
                reject();
                this.notify("Error has occurred. Please try again later.", "error");
              }
            }).catch(() => {
              reject();
            }); 
      }else{
        reject();
      }

    });

  };

  closeNotificationAlert = (state) => {
    const notiCopy = JSON.parse(
      JSON.stringify(this.state.receivedData?.notifications)
    );
    notiCopy[state] = false;
    this.updateParts(this.state.uid, "notifications", notiCopy, true, "");
  };

  handleLikingComments = ({
    type,
    bool,
    postId,
    postOwnerId,
    userName,
    userAvatarUrl,
    myId,
    commentIndex,
    commentText,
    contentURL,
    contentType,
    subCommentIndex,
    subComment,
    comment}
  ) => {
    const {commentId, notiId} = comment;
    const {subCommentId} = subComment;
    return new Promise((resolve, reject) => {
        //needs more organization
        db.collection(Consts.USERS)
          .doc(postOwnerId)
          .get()
          .then((items) => {
            const {
              posts = [],
              notifications = [],
              blockList = [],
            } = items?.data();
            let unupdatedPosts = posts;
            let noti = notifications;
            let dataCopy = JSON.parse(JSON.stringify(unupdatedPosts));
            let notiCopy = JSON.parse(JSON.stringify(noti));
            const isBlocked = blockList.some(
              (d) => d.blockedUid === this.state.uid
            );

          const postIDX = dataCopy?.length > 0 ? (dataCopy.map(p => p.id)?.indexOf(postId)): -1;
            if(dataCopy && (postIDX !== -1)){
              var likesArr = dataCopy && dataCopy[postIDX]?.comments?.[commentIndex];
                var subCommentsCopy =
                  dataCopy[postIDX].comments &&
                  dataCopy[postIDX].comments.length > 0 &&
                  likesArr.subComments;
                let savedSubIndex =
                  subCommentsCopy &&
                  subCommentsCopy.length > 0 &&
                  subCommentsCopy?.map((el) => el.subCommentId).indexOf(subCommentId);
                if (unupdatedPosts && likesArr) {
                  if (bool) {
                    if (!isBlocked) {
                      let generatedID = this.generateNewId();
                      if (type === "comment") {
                        //like
                        if(likesArr?.hasOwnProperty("likes")){
                          likesArr.likes &&
                            likesArr.likes.unshift({
                              id: myId,
                              userName: userName,
                              userAvatarUrl: userAvatarUrl,
                              notiId: generatedID,
                              date: new Date(),
                              likeId: this.generateNewId(),
                              commentId: commentId
                            });
                        }else{
                          this.notify("An unexpected error occurred", "error");
                        }

                      } else if (type === "subComment") {
                        if (subCommentIndex === savedSubIndex && savedSubIndex !== -1 &&  subCommentsCopy[savedSubIndex].hasOwnProperty("likes")) {
                          subCommentsCopy[savedSubIndex].likes &&
                            subCommentsCopy[savedSubIndex].likes.unshift({
                              id: myId,
                              userName: userName,
                              userAvatarUrl: userAvatarUrl,
                              notiId: generatedID,
                              date: new Date(),
                              likeId: this.generateNewId(),
                              commentId
                            });
                          if(notiCopy?.hasOwnProperty("list")){
                            notiCopy.isUpdate = true;
                            notiCopy.list &&
                              notiCopy.list.unshift({
                                uid: myId,
                                notiId: generatedID,
                                userName: postOwnerId === myId ? "You" : userName,
                                date: new Date(),
                                userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                                notiText: `liked this comment on your post: ${commentText}`,
                                type: "like-comment",
                                contentURL,
                                contentType,
                                commentId
                              });
                          }

                        } else {
                          this.notify("An error occurred", "error");
                        }
                      }
                    } else {
                      this.notify("Liking this user is not allowed", "error");
                    }
                  } else if (!bool) {
                    //dislike
                    // const savedPosts =
                    //   this.state.usersProfileData &&
                    //   this.state.usersProfileData?.posts &&
                    //   this.state.usersProfileData?.posts.length > 0 &&
                    //   this.state.usersProfileData?.posts[postIDX]?.comments;
                    if (type === "comment") {
                      let index = likesArr.likes
                        ?.map((el) => {
                          return el.id;
                        })
                        .indexOf(myId);
                      if (index !== -1) {
                        let notiIndex = notiCopy.list
                          ?.map((el) => {
                            return el.notiId;
                          })
                          .indexOf(
                            notiId
                          );
                        
                        if (notiIndex !== -1) {
                          notiCopy.list.splice(notiIndex, 1); //<<< FIX THIS
                        } else {
                          // this.notify("error likes 304", "error");
                        }
                        likesArr.likes.splice(index, 1);
                      } else {
                        this.notify("context 524 err", "error");
                      }
                    } else if (type === "subComment") {
                      if (
                        subCommentsCopy[savedSubIndex] &&
                        subCommentsCopy.length > 0
                      ) {
                        let indexToDelete = subCommentsCopy[savedSubIndex].likes
                          ?.map((el) => {
                            return el.id;
                          })
                          .indexOf(myId);
                        if (
                          subCommentIndex === savedSubIndex &&
                          savedSubIndex !== -1 &&
                          indexToDelete !== -1
                        ) {
                          let notiIndex = notiCopy.list
                            ?.map((el) => {
                              return el?.notiId;
                            })
                            .indexOf( subComment?.notiId );
                          if (notiIndex !== -1) {
                            notiCopy.list.splice(notiIndex, 1); //<<< FIX THIS
                          } else {
                            // this.notify("error likes 304", "error");
                          }

                          subCommentsCopy[savedSubIndex] &&
                            subCommentsCopy[savedSubIndex].likes.length > 0 &&
                            subCommentsCopy[savedSubIndex].likes.splice(
                              indexToDelete,
                              1
                            );
                        } else {
                          this.notify("context 545 err", "error");
                        }
                      }
                    }
                  }
                  if (likesArr && likesArr.likes.length > 0) {
                    likesArr.likes = Array.from(
                      new Set(likesArr.likes.map((itemId) => itemId.id))
                    ).map((ID) => likesArr.likes.find((el) => el.id === ID));
                  }

                  if (
                    subCommentsCopy &&
                    subCommentsCopy[savedSubIndex] &&
                    subCommentId &&
                    subCommentsCopy[savedSubIndex].likes
                  ) {
                    subCommentsCopy[savedSubIndex].likes = Array.from(
                      new Set(
                        subCommentsCopy[savedSubIndex].likes.map((itemId) => itemId.id)
                      )
                    ).map((ID) =>
                      subCommentsCopy[savedSubIndex].likes.find((el) => el.id === ID)
                    );
                  }
                  this.updateParts(postOwnerId, "posts", dataCopy, false, notiCopy).then(() => {
                      resolve();
                  }).catch(() => {
                      reject();
                  });
                }else{
                  reject();
                }
            }else{
              reject();
              this.notify("Post may have been deleted by the owner.", "error");
            }
    });


      });
  };
  authLogout(history) {
    const currUID = this.state.uid;
    if(currUID){
      var userStatusDatabaseRef = firebase.database().ref('/status/' + currUID);
          var changedObject = {
              state: 'offline',
              last_changed: firebase.database.ServerValue.TIMESTAMP,
          };
          userStatusDatabaseRef.set(changedObject);
    }
    
    return new Promise((resolve, reject) => {
      auth
        .signOut()
        .then(() => {
          this.resetAllData();
          this.updateUserState(false);
          localStorage.clear();
          history.replace("/auth");
          this.notify("","clear_all");
          document.documentElement.style.setProperty("--active-font-family", `Raleway,'Segoe UI', Roboto, Helvetica, Arial, sans-serif`);
          // window.location.reload();
          resolve();
        })
        .catch((err) => {
          this.notify(err.message, "error");
          reject();
        });
    });
  }
  removeFollowRequest = ({receiverUid , receiverRequests, type}) => { //PLEASE REFACTOR
      if(type === "received"){
                              //remove from received request
                              const myReqsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.followRequests));
                              const followRequestsCopy = JSON.parse(JSON.stringify(receiverRequests));
                              
                             
                                  const theirIndex = myReqsCopy?.sent?.map(k => k.uid).indexOf(receiverUid);
                                  if(myReqsCopy && myReqsCopy.hasOwnProperty("sent") && myReqsCopy.sent.length > 0  && theirIndex !== -1){
                                    myReqsCopy.sent.splice(theirIndex, 1);
                                    this.updateParts(this.state.uid, "followRequests", myReqsCopy, true, "");
                                    const myIndex = followRequestsCopy?.received?.map(k => k.uid).indexOf(this.state.uid);
                                    if(followRequestsCopy && followRequestsCopy.hasOwnProperty("received") && myIndex !== -1){
                                      followRequestsCopy.received.splice(myIndex, 1);
                                      //remove from sent request
                                      this.updateParts(receiverUid, "followRequests", followRequestsCopy, false, "");
                                    }else{
                                      this.notify("An error occurred. Please try again later.", "error");
                                    }
                                  }else{
                                    this.notify("An error occurred. Please try again later.", "error");
                                  }
                              
      }else if (type === "sent"){
                                //remove from sent request
                          const followRequestsCopy = JSON.parse(JSON.stringify(receiverRequests));
                          const myReqsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.followRequests));
                          
                          const theirIndex = myReqsCopy?.received?.map(k => k.uid).indexOf(receiverUid);
                          if(myReqsCopy && myReqsCopy.hasOwnProperty("received") && myReqsCopy?.received?.length > 0  && theirIndex !== -1){
                                myReqsCopy.received.splice(theirIndex, 1);
                               this.updateParts(this.state.uid, "followRequests", myReqsCopy, true, "");
                               const myIndex = followRequestsCopy?.sent?.map(k => k.uid).indexOf(this.state.uid);
                                if(followRequestsCopy && followRequestsCopy.hasOwnProperty("sent") && followRequestsCopy.sent.length >0 && myIndex !== -1){
                                  followRequestsCopy.sent.splice(myIndex, 1);
                                    //remove from received request
                                     this.updateParts(receiverUid, "followRequests", followRequestsCopy, false, "");
                                }else{
                                  this.notify("An error occurred. Please try again later.", "error");
                                }
                              }else{
                                this.notify("An error occurred. Please try again later.", "error");
                              }
      }


  }
  handleFollowing(
    state,
    receiverUid,
    receiverName,
    receiverAvatarUrl,
    isVerified,
    senderUid,
    senderName,
    senderAvatarUrl,
    confirmed,
    requestRemovalAuthorized
  ) {
    if (receiverUid) {
     return new Promise((resolve, reject) => {
        db.collection(Consts.USERS)
          .doc(receiverUid)
          .get()
          .then((items) => {
            resolve();
            if (items) {
              const { notifications = {}, blockList = [], profileInfo = {}, followRequests = {received: [], sent: []} } = items?.data();
              var unupdatedReceiversData = items.data()?.followers; //receiver's data
              var unupdatedSendersData = this.state.receivedData?.following; //sender's data
              var noti = notifications;
              let receiversCopy = JSON.parse(
                JSON.stringify(unupdatedReceiversData)
              ); //creates a copy for each user's data
              let sendersCopy = JSON.parse(JSON.stringify(unupdatedSendersData));
              let notiCopy = JSON.parse(JSON.stringify(noti));
              const isBlocked = blockList.some(
                (g) => g.blockedUid === this.state.uid
              );
              const blockedThem = this.state.receivedData?.blockList.some(
                (g) => g.blockedUid === receiverUid
              );
              if (!blockedThem) {
                if (!state) {
                  //follow
                  //makes sure the user somehow doesn't follow themselves
                  if (receiverUid !== senderUid) {
                    if (!isBlocked) {
                      // if private account and unconfirmed
                      if( !confirmed && profileInfo?.professionalAcc?.private ){
                          let followRequestsCopy = JSON.parse(JSON.stringify(followRequests));
                          // received
                          if(followRequestsCopy && items?.data()?.hasOwnProperty("followRequests") && items?.data()?.followRequests.hasOwnProperty("received")){
                            const receivedObj = {
                              uid: this.state.uid,
                              userName: this.state.receivedData?.userName,
                              userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                              name: this.state.receivedData?.profileInfo?.name,
                              date: new Date(),
                              isVerified: this.state.receivedData?.isVerified || false
                            }
                            followRequestsCopy.received.unshift(receivedObj);
                            notiCopy.isUpdate = true;
                            if(Object.values(receivedObj).every(el => el !== undefined)){
                                followRequestsCopy.received = Array.from(
                                new Set(followRequestsCopy.received.map((item) => item.uid))
                              ).map((id) => {
                                return followRequestsCopy.received.find((el) => el.uid === id);
                              }); //removes duplicates
                              // sent
                              const myFollowRequestsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.followRequests));
                              if(myFollowRequestsCopy && this.state.receivedData.hasOwnProperty("followRequests") && this.state.receivedData?.followRequests.hasOwnProperty("sent")){
                                const sentObj = {
                                  uid: receiverUid,
                                  userName: items.data()?.userName,
                                  userAvatarUrl: items.data()?.userAvatarUrl,
                                  name: items.data()?.profileInfo?.name,
                                  date: new Date(),
                                  isVerified: items.data()?.isVerified || false
                                }
                                myFollowRequestsCopy.sent.unshift(sentObj);
                                if(Object.values(sentObj).every(el => el !== undefined)){
                                  myFollowRequestsCopy.sent = Array.from(
                                    new Set(myFollowRequestsCopy.sent.map((item) => item.uid))
                                  ).map((id) => {
                                    return myFollowRequestsCopy.sent.find((el) => el.uid === id);
                                  }); //removes duplicates
                                  this.updateParts(receiverUid, "followRequests", followRequestsCopy, false, notiCopy );
                                  this.updateParts(this.state.uid, "followRequests", myFollowRequestsCopy, false, "");
                                }else{
                                  this.notify("An unexpected error occurred", "error");
                                }
                              }else{
                                this.notify("An unexpected error occurred", "error");
                              }
                              
                            }else{
                              this.notify("An unexpected error occurred", "error");
                            }
                          }else{
                            this.notify("An unexpected error occurred", "error");
                          }
                      }else{
                        //if public account or confirmed
                        if(confirmed){
                          db.collection(Consts.USERS)
                              .doc(senderUid)
                              .get()
                              .then((items) => {
                                this.notify(`Confirmed. Now you and ${senderName ? senderName : "this user"} are friends. `,"success");
                                this.removeFollowRequest( {receiverUid: senderUid, receiverRequests: items?.data()?.followRequests, type: "sent"} );
                              }).catch((err) => {
                                this.notify((err?.message || "An error occurred"),"error");
                              });
                         
                        }
                          const generatedID = this.generateNewId();
                          if(items.data()?.hasOwnProperty("followers")){
                            receiversCopy.unshift({
                              senderUid,
                              senderName,
                              senderAvatarUrl,
                              notiId: generatedID,
                              date: new Date(),
                              isVerified: this.state?.receivedData?.isVerified
                            });
                            let newReceiversCopy = Array.from(
                              new Set(receiversCopy.map((item) => item.senderUid))
                            ).map((id) => {
                              return receiversCopy.find((el) => el.senderUid === id);
                            }); //removes duplicates
                            if(!confirmed){
                              notiCopy.isUpdate = true; //adds a notification
                              if (notiCopy.list) {
                                  notiCopy.list.unshift({
                                    notiId: generatedID,
                                    userName: senderName,
                                    uid: senderUid,
                                    date: new Date(),
                                    type: "follow",
                                    userAvatarUrl: senderAvatarUrl,
                                    notiText: `started following you`,
                                  });
                              }
                            }
                                this.updateParts(
                                  receiverUid,
                                  "followers",
                                  newReceiversCopy,
                                  false,
                                  notiCopy
                                );
                            
                          }else{
                            this.notify("An unexpected error occurred", "error");
                          }
                        
                          if(this.state.receivedData?.hasOwnProperty("following")){
                              // pushes receiver's data into following sender's array
                              sendersCopy.unshift({
                                receiverUid,
                                receiverName,
                                receiverAvatarUrl,
                                date: new Date(),
                                isVerified
                              });
                              let newSendersCopy = Array.from(
                                new Set(sendersCopy.map((item) => item.receiverUid))
                              ).map((id) => {
                                return sendersCopy.find((el) => el.receiverUid === id);
                              }); //removes duplicates

                              this.updateParts(
                                senderUid,
                                "following",
                                newSendersCopy,
                                true,
                                ""
                              ); 
                          }else{
                            this.notify("An unexpected error occurred", "error");
                          }
                      }                   
                    } else {
                      this.notify("Following this user is not allowed because you are being blocked by them.", "error");
                    }
                    } else {
                      this.notify("Following yourself is not allowed", "warning");
                    }
                } else if (state) {
                  //unfollow
                  
                    if(!confirmed){
                        const { uid, userAvatarUrl, userName, isVerified } = items?.data();
                        const setArrData = {
                          uid,
                          userAvatarUrl,
                          userName,
                          name: profileInfo?.name,
                          isPrivate: profileInfo?.professionalAcc?.private,
                          isVerified
                        }
                        this.handleUnfollowingUsers({user: setArrData, state: true});
                        // if private
                        if( profileInfo?.professionalAcc?.private && followRequests.received?.some(l => l?.uid === this.state.uid) && !this.state.receivedData?.following?.some(v => v?.receiverUid === receiverUid)){
                          if(requestRemovalAuthorized){
                             this.removeFollowRequest( {receiverUid , receiverRequests: followRequests, type: "received"} );
                          }
                        }else if(!profileInfo?.professionalAcc?.private){
                          this.handleUnfollowingUsers({user: setArrData, state: true});
                        }
                    }else if(confirmed && requestRemovalAuthorized && profileInfo?.professionalAcc?.private && followRequests.received?.some(l => l?.uid === this.state.uid) && !this.state.receivedData?.following?.some(v => v?.receiverUid === receiverUid)){
                          this.removeFollowRequest( {receiverUid , receiverRequests: followRequests, type: "received"} );
                    }else if(confirmed && this.state.receivedData?.following?.some(v => v?.receiverUid === receiverUid)){
                        //if public
                        // removes sender from receiver's followers array
                        //finds follower's index
                        const currIndex = unupdatedReceiversData
                          ?.map((item) => {
                            return item.senderUid;
                          })
                          .indexOf(senderUid);
                        //finds its notification's index
                        if (currIndex !== -1) {
                          const notiIndex = notiCopy?.list
                            ?.map((el) => {
                              return el.notiId;
                            })
                            .indexOf(unupdatedReceiversData[currIndex].notiId);
                          if(Object.keys(notiCopy).length > 0 && notiCopy?.list){
                              if (notiIndex !== -1) {
                                notiCopy.list.splice(notiIndex, 1);
                              } else {
                                // this.notify("Failed", "error");
                              }
                              // notiCopy.list = Array.from(
                              //   new Set(notiCopy.list.map((item) => item.uid))
                              // ).map((id) =>
                              //   notiCopy.list.find((el) =>
                              //     el.type === "follow" ? el.uid === id : el
                              //   )
                              // );
                              notiCopy.list = Array.from(
                                new Set(notiCopy.list?.map((item) => item.notiId))
                              ).map((id) => notiCopy.list?.find((el) => el.notiId === id));
                          }
                          //removes follower
                          receiversCopy.splice(currIndex, 1);
                          //removes their notification
                          this.updateParts(
                            receiverUid,
                            "followers",
                            receiversCopy,
                            false,
                            notiCopy
                          );
                        } else {
                          //>>>> HIDDEN TEMPORARILY
                          // this.notify("You have to wait at least 5 seconds between following and unfollowing the same person", "info");
                        }
                        const currIndex2 = unupdatedSendersData
                          ?.map((item) => {
                            return item.receiverUid;
                          })
                          .indexOf(receiverUid);
                        if (currIndex2 !== -1) {
                          // removes receiver from sender's following array
                          sendersCopy.splice(currIndex2, 1);
                          this.updateParts(
                            senderUid,
                            "following",
                            sendersCopy,
                            true,
                            ""
                          );
                        } else {
                          this.notify("You have to wait at least between following and unfollowing the same person", "info");
                        }
                    }
                }
              } else {
                this.notify(
                  "Following this user is not allowed. Unblock them first.",
                  "error"
                );
              }
            }
          }).catch(err => {
            this.notify((err?.message || "An error has occurred"),"error");
            reject(err?.message);
          });
     });

    }
  }

  handleSendingMessage({content, uid, type, pathname}) { //needs more organization
    const myUid = this.state.uid;
    return new Promise((resolve, reject) => {
        if (uid !== myUid) {
          // Edit receiver's data
          db.collection(Consts.USERS)
            .doc(uid)
            .get()
            .then((items) => {
              resolve();
              const randomId = this.generateNewId();
              const {
                messages = [],
                notifications = [],
                blockList = [],
              } = items?.data();
              const unupdatedReceiversData = messages;
              const noti = notifications;

              let notiCopy = JSON.parse(JSON.stringify(noti));
              const isBlocked = blockList.some(
                (d) => d.blockedUid === this.state.uid
              );
              if (!isBlocked) {
                // Edit sender's data
                const myData = this.state.receivedData;
                const unupdatedSendersData = this.state.receivedData?.messages;
                let typeProp = type === "text" ? "textMsg" : type === "post" ? "postContent" : "contentUrl";
                const objToSend = {
                [typeProp]:  type !== "like" ? content : "",
                  uid: myUid,
                  userName: myData?.userName,
                  userAvatarUrl: myData?.userAvatarUrl,
                  date: new Date(),
                  type: type,
                  id: randomId,
                  contentName: (type === "video" || type === "picture" || type === "audio" || type === "document" || type === "record") ? pathname : ""
                }
                const checkForValidation = Object.values(objToSend).every(prop => prop !== undefined && prop !== null );
                if(checkForValidation){
                      const blockedThem = this.state.receivedData?.blockList.some(
                      (h) => h.blockedUid === uid
                    );
                    if (!blockedThem) {
                      let sendersCopy = JSON.parse(
                        JSON.stringify(unupdatedSendersData)
                      );
                      const initializeDialog = () => {
                        const theirData = items?.data();
                        this.initializeChatDialog(theirData.uid, theirData?.userName, theirData?.userAvatarUrl, theirData?.isVerified);
                      }
                      
                      if(sendersCopy?.some(usr => usr?.uid === uid)){
                          if(unupdatedReceiversData?.some(el => el?.uid === myUid)){ 
                            let currIndex = sendersCopy
                              .map((item) => {
                                return item?.uid;
                              })
                              .indexOf(uid);
                              if (currIndex !== -1 && sendersCopy[currIndex] && sendersCopy[currIndex]?.chatLog && sendersCopy[currIndex]?.hasOwnProperty("chatLog")) {
                                  sendersCopy[currIndex].chatLog.push(objToSend);                  
                                  let receiversCopy = JSON.parse(
                                    JSON.stringify(unupdatedReceiversData));
                                  const sendToUser = () => {
                                    let currIndex = receiversCopy && receiversCopy.length > 0 && receiversCopy
                                                  ?.map((el) => {
                                                    return el?.uid;
                                                  })
                                                  .indexOf(myUid); //derives the index from an id
                                                //looks for ours id in person's data
                                                if (currIndex !== -1 && receiversCopy[currIndex] && receiversCopy[currIndex].chatLog && receiversCopy[currIndex]?.hasOwnProperty("chatLog")) {
                                                  notiCopy.isNewMsg = true;
                                                  receiversCopy[currIndex].chatLog.push(objToSend);
                                                  receiversCopy[currIndex].notification = true;
                                                  receiversCopy[currIndex].lastMsgDate = new Date();
                                                  this.updateParts(myUid, "messages", sendersCopy, true, "");
                                                  this.updateParts(uid, "messages", receiversCopy, false, notiCopy);
                                                } else {
                                                  this.notify("Failed to send.", "error");
                                                }
                                  }
                                    sendToUser();
                                } else {
                                  this.notify("Failed to send. Please try again.", "error");
                                }
                          }else{
                            initializeDialog();
                            this.notify("Failed to send. Please try again.", "error");
                          }
                      }else{
                        initializeDialog();
                        this.notify("Something went wrong. Please try again later.", "error");
                      }
                    
                    } else {
                      this.notify(
                        "Messaging this user is not allowed because you blocked them.",
                        "error"
                      );
                    }
                }else{
                  this.notify("Something went wrong. Please try again later.", "error");
                }

              } else {
                this.notify("Messaging this user is not allowed because you have been blocked by them.", "error");
              }
            }).catch((err) => {
              reject();
              this.notify((err?.message || "Failed to send." ),"error");
            });
        } else {
          reject();
          this.notify("Sending messages to yourself is not allowed", "warning");
        }
    });

  }

  initializeChatDialog(uid, receiverName, receiversAvatarUrl, isVerified) {
    //checks initialized data existance in my messages
    return new Promise((resolve, reject) => {
      if (!this.state.receivedData?.messages.some((el) => el.uid === uid)) {
        // sender
        const unupdatedSendersData = this.state.receivedData?.messages;
        let sendersCopy = JSON.parse(JSON.stringify(unupdatedSendersData));
        const blockedThem = this.state.receivedData?.blockList.some(
          (h) => h.blockedUid === uid
        );
        if (!blockedThem) {
          if(this.state.receivedData?.hasOwnProperty("blockList")){
            sendersCopy.unshift({
                uid: uid,
                userName: receiverName,
                userAvatarUrl: receiversAvatarUrl,
                date: new Date(),
                chatLog: [],
                isVerified,
                lastMsgDate: "",
                notification: false,
                theme: "default"
              });
              let newCopy = Array.from(
                new Set(sendersCopy.map((item) => item.uid))
              ).map((id) => {
                return sendersCopy.find((el) => el.uid === id);
              });
            
              
                this.updateParts(this.state.uid, "messages", newCopy, true, "").catch(() => {
                  reject();
                  this.notify("An unexpected error occurred","error");
                })
          }else{
            reject();
            this.notify("An unexpected error occurred","error");
          }
         
        } else {   
          reject();   
          this.notify("Not allowed.", "error");
        }
    }else{
      resolve();
    }
     //checks initialized data existance in thier messages
      // receiver
        db.collection(Consts.USERS)
          .doc(uid)
          .get()
          .then((items) => {
            const { messages = [], blockList = [] } = items?.data();
            const unupdatedreceiversData = messages;
            if(!unupdatedreceiversData.some(el => el.uid === this.state.uid)){
               
                let receiversCopy = JSON.parse(
                  JSON.stringify(unupdatedreceiversData)
                );
                const isBlocked = blockList.some(
                  (d) => d.blockedUid === this.state.uid
                );
                if (!isBlocked) {
                  if(items?.data()?.hasOwnProperty("messages")){
                    receiversCopy.unshift({
                      uid: this.state.uid,
                      userName: this.state.receivedData?.userName,
                      userAvatarUrl: this.state.receivedData?.userAvatarUrl,
                      date: new Date(),
                      chatLog: [],
                    });
                    let newCopy = Array.from(
                      new Set(receiversCopy.map((item) => item.uid))
                    ).map((id) => {
                      return receiversCopy.find((el) => el.uid === id);
                    });
                    this.updateParts(uid, "messages", newCopy, false, "").then(() => {
                       resolve();
                    }).catch(() => {
                      reject();
                      this.notify("An unexpected error occurred","error");
                    });
                  }else{
                    reject();
                    this.notify("An unexpected error occurred","error");
                  }
                 
                } else {
                  reject();;
                  this.notify("You have blocked this user. Unblock them to be able to send them messages.", "error");
                }
               
            }else{
              resolve();
            }
          })
          .catch(() => {
            reject();
          });
      });
  }

  handleEditingProfile(formData, type) {
    let copiedArr = JSON.parse(
      JSON.stringify(this.state.receivedData?.profileInfo)
    );
    return new Promise((resolve, reject) => {
        if (formData && copiedArr) {
          switch (type) {
            case "editProfile":
              Object.keys(copiedArr).length > 0 &&
                Object.keys(copiedArr).forEach((item) => copiedArr[item] = item === 'bio' ? this.cleanseText(formData[item]) :formData[item]);
              break;
            case "professionalAcc":
              if (Object.keys(copiedArr).length > 0 && copiedArr.professionalAcc) {
                copiedArr.professionalAcc = formData;
              }
              break;
            default:
              Object.keys(copiedArr).length > 0 &&
                Object.keys(copiedArr).forEach((item) => copiedArr[item] = formData[item]);
          }
        this.updateParts(this.state.uid, "profileInfo", copiedArr, false, "").then(() => {
          resolve();
        }).catch((err) => reject(err));
      }else{
        reject("");
      }
    })

  }
  handleChangingSort(formData) {
    const profileCopy = JSON.parse(JSON.stringify(this.state.receivedData?.profileInfo));
    if(formData && typeof formData === "object" && Object.values(formData).map(el  => el && el !== undefined) && profileCopy && profileCopy?.sort){
      Object.keys(profileCopy?.sort).map(el => profileCopy.sort[el] = formData[el]);
      this.updateParts(this.state.uid, "profileInfo", profileCopy, false, "");
    }
   
  }

  deletePost(postId, postIndex, contentPath, contentURL) {
    return new Promise((resolve, reject) => {
          const buttons = [
            {
              label: "Cancel",
              onClick: () => {reject()}
            },
            {
              label: "Delete",
              onClick: () => {
                const myPosts = this.state.receivedData?.posts;
                let postsCopy = JSON.parse(JSON.stringify(myPosts));
                let notiCopy = JSON.parse(JSON.stringify(this.state.receivedData?.notifications));
                // deletes post data from database
                let extractedIndex = myPosts
                  ?.map((el) => {
                    return el.id;
                  })
                  .indexOf(postId);
                if (extractedIndex === postIndex && postIndex !== -1) {
                  
                  //makes sure to delete the right post
                  if(Object.keys(notiCopy)?.length > 0 && notiCopy?.list?.length > 0){
                    notiCopy?.list.length > 0 && notiCopy.list.filter(noti => (noti?.contentURL) && noti?.contentURL === contentURL).forEach(item => {
                      const getNotiIndex = notiCopy?.list?.map(s => s.notiId).indexOf(item?.notiId);
                      if(getNotiIndex !== -1){
                        notiCopy.list.splice(getNotiIndex, 1);
                        notiCopy.list = Array.from(
                        new Set(notiCopy.list.map((itemId) => itemId.notiId))
                        ).map((ID) => notiCopy.list.find((el) => el.notiId === ID));
                      }
                    })
                  }
                
                  postsCopy.splice(postIndex, 1);
                  // deletes content from storage
                  if (contentPath) {
                    this.deleteContentFromFB(contentPath, "content").catch((err) => {
                      this.notify(err, "error");
                    });
                  }
                  // updates data
                  this.notify("Post has been deleted");
                
                  this.updateParts(this.state.uid, "posts", postsCopy, true, notiCopy);
                  resolve();
                }else{
                  reject();
                  this.notify("Post may got deleted already.","error");
                }
              },
            },
          ];
          this.confirmPrompt(
            "Delete Confirmation",
            buttons,
            "Are you sure you want to delete this post?"
          );
    });
  }

  notify(text, type) {
    if(text && typeof text === "string"){
        // allows average users to read each word in 350 milliseconds
        const estimateDuration = (text?.split(" ").length) * 350;
        const notiSettings = {
          position: "top-left",
          autoClose: (estimateDuration < 4000) ? 6000 : (estimateDuration > 25000) ? 25000 : estimateDuration,
          closeOnClick: true
        }
        switch (type) {
          case "success":
            toast.success(text, notiSettings);
            break;
          case "warning":
            toast.warn(text, notiSettings);
            break;
          case "error":
            toast.error(text, notiSettings);
            break;
          case "info":
            toast.info(text, notiSettings);
            break;
          case "dark":
            toast.dark(text, notiSettings);
            break;
          default:
            toast(text, notiSettings);
        }  
    } else if("clear_all"){
        toast.dismiss();
    }
  }

  confirmPrompt(title, buttons, msg, reject) {
    confirmAlert({
      title,
      buttons,
      message: msg,
      onClickOutside: () => typeof reject === "function" && reject()
    });
  }

  returnPassword = (binary) => {
    const binCode = [];
    for (var i = 0; i < binary.length; i++) {
      binCode.push(String.fromCharCode(parseInt(binary[i], 2)));
    }
    return binCode.join("");
  };

  changeProfilePic = (url) => {
    // Update profile picture all accross your account
    if(url || url === ""){
          const myUid = this.state.uid;
          const postsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.posts));
          const messagesCopy = JSON.parse(JSON.stringify(this.state.receivedData?.messages));
          const notificationsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.notifications));
          const reelsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.reels));
          if(postsCopy && postsCopy?.length > 0){
            postsCopy.forEach(post => {
              post.userAvatarUrl = url;
            if(post?.likes && post?.likes?.people && post?.likes?.people.length > 0){
              post.likes.people.forEach(user => {
                if(user.id === myUid){
                  user.userAvatarUrl = url
                }
              })
            }
            // ==============
            // POSTS
            // --------------
              //comemnts
            if(post?.comments && post?.comments.length > 0){
              post.comments.forEach(user => {
                if(user?.uid === myUid){
                  user.userAvatarUrl = url
                }
                if(user?.likes && user?.likes.length > 0){
                  user.likes.forEach((like => {
                    if(like?.id === myUid ){
                        like.userAvatarUrl = url;
                    }
                  }));
                }
                //sub-comments
                if(user?.subComments && user?.subComments.length > 0){
                    user.subComments.forEach(sub => {
                      if(sub?.senderUid === myUid){
                        sub.userAvatarUrl = url
                      }
                      if(sub && sub?.likes){
                        sub.likes.forEach(like => {
                          if(like?.id === myUid){
                            like.userAvatarUrl = url;
                          }
                        })
                      }
                    })
                }
                
              })
            }
          });
          } 
            // ==============
            // MESSAGES
            // --------------
          if(messagesCopy && messagesCopy.length > 0){
            messagesCopy.forEach(user => {
              if(user && Object.keys(user).length > 0 && user.chatLog && user.chatLog.length > 0){
                  user.chatLog.forEach(message=> {
                      if(message?.uid === myUid){
                        message.userAvatarUrl = url;
                      }
                    })          
              }
            
            })
          }
            // ==============
            // NOTIFICATIONS
            // --------------
          if(notificationsCopy && Object.keys(notificationsCopy).length > 0 && notificationsCopy?.list && notificationsCopy?.list.length > 0){
            notificationsCopy.list.forEach((notification => {
              if(notification.uid === myUid){
                notification.userAvatarUrl = url;
              }
            }));
          } 
            // ==============
            // REELS
            // --------------
          if(reelsCopy && reelsCopy.length > 0){
              reelsCopy.forEach(group => {
                if(group && group.reelItems && group.reelItems.length > 0){
                    group.reelItems.forEach(reelItem => {
                      if(reelItem?.reelOwnerId === myUid){
                          reelItem.userAvatarUrl = url;
                      }
                      if(reelItem.likes && reelItem.likes.length > 0){
                          reelItem.likes.forEach(like => {
                            if(like.id === myUid){
                              like.userAvatarUrl = url;
                            }
                          })
                      }

                      if(reelItem.comments && reelItem.comments.length > 0){
                        reelItem.comments.forEach(comment => {
                            if(comment?.uid === myUid){
                              comment.userAvatarUrl = url;
                            }
                        });
                      }
                    })
                }
               
              })
          }
          
        return new Promise((resolve, reject) => {
              db.collection(Consts.USERS)
                  .doc(myUid)
                  .update({
                    userAvatarUrl: url,
                    posts: postsCopy,
                    messages: messagesCopy,
                    notifications: notificationsCopy
                  })
                  .then(() => {
                      resolve();
                  })
                  .catch((err) => {
                    this.notify((err.message || "Failed to upload picture. Please try again later."), "error");
                    reject();
                  });
        })
          
    }
  };

  searchUsers = (val, approach) => {
    return new Promise((resolve, reject) => {
      const lowerVal = val.toLowerCase(); // Chuyển đổi ký tự nhập thành chữ thường
  
      this.setState({
        searchInfo: {
          ...this.state.searchInfo,
          loading: true,
        },
      });
  
      // Sử dụng query để tìm kiếm theo điều kiện `array-contains` hoặc tìm kiếm theo tên chứa ký tự nhập vào
      db.collection(Consts.USERS)
        .get()
        .then((snapshot) => {
          const users = snapshot.docs
            .map((user) => user.data())
            .filter((user) => user.userName.toLowerCase().includes(lowerVal)); // Tìm kiếm tên người dùng chứa ký tự nhập vào
  
          this.setState({
            searchInfo: {
              ...this.state.searchInfo,
              results: users,
              loading: false,
            },
          });
          resolve(users);
        })
        .catch((error) => {
          console.error("Error fetching users: ", error);
          this.setState({
            searchInfo: {
              ...this.state.searchInfo,
              loading: false,
              results: [],
            },
          });
          reject();
        });
    });
  };    

  addPost = (forwardedContent, type, group) => {
    if (type === Consts.Post) {
      if(this.state.receivedData?.hasOwnProperty("posts")){
        let postsDeepCopy = JSON.parse(
          JSON.stringify(this.state.receivedData?.posts)
        );
        postsDeepCopy.unshift(forwardedContent);
        return new Promise((resolve, reject) => {
          this.updateParts(this.state.uid, "posts", postsDeepCopy, true, "")
            .then(() => {
              resolve();
            })
            .catch(() => {
              reject();
            });
        });
      }
    } else if (type === Consts.Reel) {
      const {selectedGroup,newGroupName} = group;
      let reelGroupsDeepCopy = JSON.parse(JSON.stringify(this.state.receivedData?.reels));
    
      if((reelGroupsDeepCopy && selectedGroup.toLowerCase() === "new group") || (this.state.receivedData?.reels.length <= 0 && !this.state.receivedData?.reels?.some(el => el.groupName) )){
        //new group
        if(this.state.receivedData?.hasOwnProperty("reels")){
          reelGroupsDeepCopy.unshift({
            groupName: newGroupName || "Reel",
            id: this.generateNewId(),
            reelItems: [forwardedContent]
          })
        }else{
          this.notify("An unexpected error occurred","error");
        }
      }else if(reelGroupsDeepCopy.length > 0 && selectedGroup.toLowerCase() !== "new group" && reelGroupsDeepCopy?.some( Q => Q.groupName !== newGroupName)){
        //existing group
        const reelGroupIndex = reelGroupsDeepCopy.map(p => p.groupName.toLowerCase()).indexOf(selectedGroup.toLowerCase());
        if(reelGroupIndex !== -1 && reelGroupsDeepCopy[reelGroupIndex].hasOwnProperty("reelItems") && reelGroupsDeepCopy[reelGroupIndex].reelItems){
            reelGroupsDeepCopy[reelGroupIndex].reelItems.unshift(forwardedContent);
        }else{
          this.notify("An unexpected error occurred","error");
        }
       
      }

      return new Promise((resolve, reject) => {
          this.updateParts(this.state.uid, "reels", reelGroupsDeepCopy, true, "")
            .then(() => {
              resolve();
            })
            .catch(() => {
              reject();
            });
        });
    }
  };

  handleUserBlocking = (
    blockingState,
    blockedUid,
    userName,
    userAvatarUrl,
    profileName
  ) => {
    let myBlockListCopy = JSON.parse(
      JSON.stringify(this.state.receivedData?.blockList)
    );
    let myFollowersCopy = JSON.parse(
      JSON.stringify(this.state.receivedData?.followers)
    );
    let myFollowingCopy = JSON.parse(
      JSON.stringify(this.state.receivedData?.following)
    );
    // const blockedThem = myBlockListCopy && myBlockListCopy.some(f => f.blockedUid === blockedUid);
    //blocked
    if (myBlockListCopy && blockedUid) {
      if (blockingState) {
        db.collection(Consts.USERS)
          .doc(blockedUid)
          .get()
          .then((items) => {
            const { followers = [], following = [] } = items?.data();
            let theirFollowingCopy = JSON.parse(JSON.stringify(following));
            let theirFollowersCopy = JSON.parse(JSON.stringify(followers));
            let followingThem = theirFollowingCopy.some(
              (o) => o.receiverUid === this.state.uid
            );
            let followedMe = theirFollowersCopy.some(
              (o) => o.senderUid === this.state.uid
            );
            //update user's data
            if (followingThem || followedMe) {
              if (followingThem) {
                const uIndex = theirFollowingCopy
                  .map((q) => q.receiverUid)
                  .indexOf(this.state.uid);
                if (uIndex !== -1) {
                  theirFollowingCopy.splice(uIndex, 1);
                } else {
                  this.notify("Failed", "error");
                }
              }
              if (followedMe) {
                const userIndex = theirFollowersCopy
                  .map((q) => q.senderUid)
                  .indexOf(this.state.uid);
                if (userIndex !== -1) {
                  theirFollowersCopy.splice(userIndex, 1);
                } else {
                  this.notify("Failed", "error");
                }
              }
              new Promise((resolve, reject) => {
                db.collection(Consts.USERS)
                  .doc(blockedUid)
                  .update({
                    followers: theirFollowersCopy,
                    following: theirFollowingCopy,
                  })
                  .then(() => {
                    resolve();
                  })
                  .catch((err) => {
                    reject(err.message);
                  });
              });
            }
          });

        //updates follow states
        if (myFollowersCopy.some((o) => o.senderUid === blockedUid)) {
          const userIndex = myFollowersCopy
            .map((q) => q.senderUid)
            .indexOf(blockedUid);
          if (userIndex !== -1) {
            myFollowersCopy.splice(userIndex, 1);
          } else {
            this.notify("Failed", "error");
          }
        }
        if (myFollowingCopy.some((p) => p.receiverUid === blockedUid)) {
          const uIndex = myFollowingCopy
            .map((q) => q.receiverUid)
            .indexOf(blockedUid);
          if (uIndex !== -1) {
            myFollowingCopy.splice(uIndex, 1);
          } else {
            this.notify("Failed", "error");
          }
        }
        //updates block list
        if(this.state.receivedData?.hasOwnProperty("blockList")){
          myBlockListCopy.unshift({
            blockedUid,
            userName,
            userAvatarUrl,
            profileName,
            date: new Date()
          });
        }else{
          this.notify("An unexpected error occurred", "error");
        }

      } else if (!blockingState) {
        //unblocked
        if (
          myBlockListCopy.some((l) => l.blockedUid === blockedUid) &&
          blockedUid
        ) {
          const bIndex = myBlockListCopy
            .map((u) => u.blockedUid)
            .indexOf(blockedUid);
          if (bIndex !== -1) {
            myBlockListCopy.splice(bIndex, 1);
          } else {
            this.notify("Failed", "error");
          }
        }
      }

      let newBlockedArray = Array.from(
        new Set(myBlockListCopy.map((itemId) => itemId.blockedUid))
      ).map((ID) => myBlockListCopy.find((el) => el.blockedUid === ID));
      //update my data
      return new Promise((resolve, reject) => {
        db.collection(Consts.USERS)
          .doc(this.state.uid)
          .update({
            blockList: newBlockedArray,
            followers: myFollowersCopy,
            following: myFollowingCopy,
          })
          .then(() => {
            store.dispatch(updateSuggestionsListAsync());
            this.notify(
              blockingState
                ? `${userName ? userName : "User"} has been blocked`
                : `${userName ? userName : "User"} has been unblocked`
            );
            resolve();
          })
          .catch((err) => {
            reject(err.message);
            this.notify(err.message || "Failed to block user.");
          });
      });
    }
  };

  onCommentDeletion = (
    {type,
    ownerUid,
    postId,
    commentArr,
    subCommentArr,
    subCommentIndex,
    postOwnerId,
    }) => {
      return new Promise((resolve, reject) => {
          if(postOwnerId && ownerUid){
            if (ownerUid === this.state.uid) {
              db.collection(Consts.USERS).doc(postOwnerId).get().then((data) => {
                const mainArr = data?.data();
                if(mainArr && Object.keys(mainArr).length > 0 && mainArr?.posts.length > 0 && mainArr?.notifications){
                    const postsCopy =  JSON.parse(JSON.stringify(mainArr?.posts));
                    const notiCopy = JSON.parse(JSON.stringify(mainArr?.notifications));
                
                      const getPostIndex =
                        postsCopy?.length > 0 ? (postsCopy.map((post) => post?.id).indexOf(postId)) : -1;
                    
                      if (getPostIndex !== -1) {
                        const getCommentIndex =
                          postsCopy[getPostIndex].comments &&
                          postsCopy[getPostIndex].comments
                            .map((comment) => comment?.commentId)
                            .indexOf(commentArr?.commentId);
                        if (getCommentIndex !== -1) {

                          if (type === "comment") {
                            const getNotiIndex = Object.keys(notiCopy).length > 0 && notiCopy?.list?.length > 0 && notiCopy.list?.map(noti => noti?.notiId).indexOf(commentArr?.notiId);
                            if(getNotiIndex !== -1 && notiCopy?.list){
                              notiCopy.list.filter(el => el?.commentId === commentArr?.commentId).forEach(p => {
                                const getNotiIndex = notiCopy?.list?.map(s => s.notiId).indexOf(p?.notiId);
                                if(getNotiIndex !== -1){
                                
                                  notiCopy.list.splice(getNotiIndex, 1);
                                  notiCopy.list = Array.from(
                                  new Set(notiCopy.list.map((itemId) => itemId.notiId))
                                  ).map((ID) => notiCopy.list.find((el) => el.notiId === ID));
                                }
                              })
                              
                            }
                            postsCopy &&
                              postsCopy[getPostIndex].comments.splice(getCommentIndex, 1);
                          } else if (type === "subComment") {
                            const getSubCommentIndex =
                              postsCopy[getPostIndex].comments &&
                              postsCopy[getPostIndex].comments[getCommentIndex].subComments &&
                              postsCopy[getPostIndex].comments[getCommentIndex].subComments
                                .map((subComment) => subComment?.subCommentId)
                                .indexOf(subCommentArr?.subCommentId);
                            if (
                              getSubCommentIndex === subCommentIndex &&
                              getSubCommentIndex !== -1
                            ) {
                              const getSubNotiIndex = Object.keys(notiCopy).length > 0 && notiCopy?.list?.length > 0 && notiCopy.list?.map(noti => noti?.notiId).indexOf(subCommentArr?.notiId);
                              const checkId = postsCopy[getPostIndex].comments[getCommentIndex].subComments?.[getSubCommentIndex]?.notiId === subCommentArr?.notiId;
                            if(getSubNotiIndex !== -1 && notiCopy?.list && checkId){
                              notiCopy.list.splice(getSubNotiIndex, 1);
                            }
                              postsCopy &&
                                postsCopy[getPostIndex].comments[
                                  getCommentIndex
                                ].subComments.splice(getSubCommentIndex, 1);
                            }
                          }
                          const buttons = [
                            {
                              label: "No",
                              onClick: () => {
                                reject();
                              }
                            },
                            {
                              label: "Yes",
                              onClick: () => {
                                this.updateParts(postOwnerId, "posts", postsCopy, true, notiCopy)
                                  .then(() => {
                                    resolve();
                                    this.notify(
                                      `${type === "comment" ? "Comment" : "Reply"} has been deleted`
                                    );
                                  })
                                  .catch((err) => {
                                    reject();
                                    this.notify(err || "An error occurred");
                                  });
                              },
                            },
                          ];
                          this.confirmPrompt(
                            "Confirmation",
                            buttons,
                            "Comment will be deleted. Proceed?",
                            reject
                          );
                        } else {
                          reject();
                          this.notify(
                            "An error occurred. Please try to delete comment later.",
                            "error"
                          );
                        }
                      } else {
                        reject();
                        this.notify(
                          "An error occurred. Please try to delete comment later.",
                          "error"
                        );
                      }
                } else {
                    reject();
                    this.notify("Error occurred");
                    }
                })
              }else{ 
                reject();
                this.notify("Comment deletion of other users is prohibited.", "error");
                
              }
          }else{
            reject();
            this.notify("Error occurred");
          }
      });

 
  };

  unsendMessage = ({user, id, type, pathname}) => {
    const {uid} = user;
    const myMessagesCopy = JSON.parse(JSON.stringify(this.state.receivedData?.messages));
    if(myMessagesCopy?.some(user => user?.uid === uid)){
          const getUsersIndexInMSGBox = myMessagesCopy?.map(user => user?.uid).indexOf(uid);
          const buttons = [
              {
                label: "Cancel",
              },
              {
                label: "Unsend",
                onClick: () => {
                  // edit my data
                  if(getUsersIndexInMSGBox !== -1){
                        const getMsgIndex = myMessagesCopy[getUsersIndexInMSGBox]?.chatLog?.length > 0 && myMessagesCopy[getUsersIndexInMSGBox]?.chatLog.map(msg => msg.id).indexOf(id);
                        if(getMsgIndex !== -1){
                            myMessagesCopy[getUsersIndexInMSGBox].chatLog.splice(getMsgIndex, 1);
                            this.updateParts(this.state.uid, "messages", myMessagesCopy, false, "");
                            // edit user's data
                            db.collection(Consts.USERS).doc(uid).get().then(usersData => {
                              const usersMessagesCopy = JSON.parse(JSON.stringify(usersData?.data()?.messages));
                              if(usersMessagesCopy?.some(user => user?.uid === this.state.uid)){
                                  const getMyIndexInTheirData = usersMessagesCopy.map(user => user?.uid).indexOf(this.state.uid);
                                  
                                    if(getMyIndexInTheirData !== -1 && usersMessagesCopy[getMyIndexInTheirData] && usersMessagesCopy[getMyIndexInTheirData].chatLog){
                                      const getMyMSGIndex = usersMessagesCopy?.[getMyIndexInTheirData]?.chatLog?.map(msg => msg.id).indexOf(id);
                                      const checkId = usersMessagesCopy?.[getMyIndexInTheirData]?.chatLog?.[getMyMSGIndex]?.id === id;
                                      if(getMyMSGIndex !== -1 && checkId){
                                        usersMessagesCopy[getMyIndexInTheirData].chatLog.splice(getMyMSGIndex, 1);
                                        if((type === "video" || type === "picture" || type === "audio" || type === "document" || type === "record") && pathname){
                                            this.deleteContentFromFB(pathname , "messages");
                                        }
                                        this.updateParts(uid, "messages", usersMessagesCopy, false, "");
                                      }else{
                                        this.notify("Something went wrong! Please try again later", "error");
                                      }
                                    }else{
                                      this.notify("Something went wrong! Please try again later", "error");
                                    }
                              }else{
                                this.notify("Something went wrong! Please try again later", "error");
                              }
                            });
                        }else{
                          this.notify("Something went wrong! Please try again later", "error");
                        }
                  }
                  
                },
              },
            ];
            this.confirmPrompt(
              "Confirmation",
              buttons,
              "Unsending will remove the message from everyone. People may have seen it already."
            );
    }else{
      this.notify("Something went wrong! Please try again later", "error");
    }
    
  }

  deleteChat = (uid) => {
    return new Promise((resolve, reject) => {
      const myMessagesCopy = JSON.parse(JSON.stringify(this.state.receivedData?.messages));
          const buttons = [
            {
              label: "No",
            },
            {
              label: "Yes",
              onClick: () => {
                  // edit my data
                  if(myMessagesCopy?.some(user => user?.uid === uid)){
                    const getTheirIndex = myMessagesCopy.map(user => user?.uid).indexOf(uid);
                    if(getTheirIndex !== -1 && myMessagesCopy && myMessagesCopy[getTheirIndex] && myMessagesCopy[getTheirIndex]?.chatLog){
                      myMessagesCopy[getTheirIndex].chatLog.filter(msg => (msg.type === "video" || msg.type === "picture" || msg.type === "audio" || msg.type === "document")).forEach(item => {
                          if(item){
                            storageRef.child(`messages/${item?.uid}/${item?.contentName}`).delete();
                          }
                        })
                        myMessagesCopy.splice(getTheirIndex,1);
                        this.notify("Chat deleted","success");
                        this.updateParts(this.state.uid, "messages", myMessagesCopy, false, "");
                        resolve();
                    }else{
                      reject();
                      this.notify("Failed to delete chat. Please try again later.","error");
                    }
                  }else{
                    reject();
                    this.notify("Failed to delete chat. Please try again later.","error");
                  }
                //edit their's
                  db.collection(Consts.USERS).doc(uid).get().then(res => {
                    const theirMsgs = JSON.parse(JSON.stringify(res?.data()?.messages));
                    if(theirMsgs?.some(user =>  user?.uid === this.state.uid)){
                        const getMyIndex = theirMsgs.map(user => user?.uid).indexOf(this.state.uid);
                        if(getMyIndex !== -1){
                          theirMsgs.splice(getMyIndex,1);
                          this.updateParts(uid, "messages", theirMsgs, false, "");
                          resolve();
                        }else{
                          this.notify("Failed to delete chat. Please try again later.","error");
                          reject();
                        }
                    }else{
                      reject();
                    }
                  });
              },
            },
          ];
          this.confirmPrompt(
            "Confirmation",
            buttons,
            "Chat will be permanently deleted from both sides. Proceed?",
            reject
          );

    });
   }
  handleSavingPosts = (postObj) => {
    const {boolean, data} = postObj;
    if(data && (data?.contentType === Consts.Image || data?.contentType === Consts.Video) ){
        let savedPostsCopy = JSON.parse(JSON.stringify(this.state.receivedData?.savedposts));
        if(this.state.receivedData?.hasOwnProperty("savedposts") && savedPostsCopy){
          if(Object.values(data).every(s => s && s !== undefined)){
              if(boolean){
                  savedPostsCopy.unshift(data);
              }else if(!boolean){
                  const SPIndex = savedPostsCopy?.map(el => el.id).indexOf(data?.id);
                  if(SPIndex !== -1){
                    savedPostsCopy.splice(SPIndex,1);
                  }
              }
          }else{
            this.notify("An error occurred", "error");
          }
        }
        savedPostsCopy = Array.from(
          new Set(savedPostsCopy.map((itemId) => itemId.id))
        ).map((ID) => savedPostsCopy.find((el) => el.id === ID));
        this.updateParts(this.state.uid, "savedposts", savedPostsCopy, false, "");
    }else{
      this.notify("You can only save video and image content","info");
    }
  }
  closeNewMsgNoti = (userUid) => {
    const messagesCopy = JSON.parse(JSON.stringify(this.state.receivedData?.messages));
    const userIndex = messagesCopy && messagesCopy.length> 0 && messagesCopy?.map(user => user?.uid).indexOf(userUid);
    if(userIndex !== -1 && messagesCopy?.[userIndex]){
      messagesCopy[userIndex].notification = false;
      this.updateParts(this.state.uid, "messages", messagesCopy, false, "");
    }
  };

  handleFollowRequests = ({type, userId, userAvatarUrl, userName, isVerified}) => {
  return new Promise((resolve, reject) => {
      if(userId){
        if(type === "delete"){
          db.collection(Consts.USERS)
          .doc(userId)
          .get()
          .then((items) => {
            this.removeFollowRequest( {receiverUid: userId, receiverRequests: items?.data()?.followRequests, type: "sent"} );
            resolve();
          }).catch(() => {
            reject();
          });
        }else if(type === "confirm"){
            this.handleFollowing(
              false,
              this.state.uid,
              this.state.receivedData?.userName,
              this.state.receivedData?.userAvatarUrl,
              isVerified,
              userId,
              userName,
              userAvatarUrl,
              true
            ).then(() => {
              resolve();
            }).catch(() => {
              reject();
            })
          }
      }else{
        reject();
      }
  });

  }
  handleUnfollowingUsers = ({user, state}) => {
    this.setState({
      unfollowModal: {user, state}
    });
  }
  testStorageConnection = () => {
    // FIND AN ALTERNATIVE
    storage && storage.ref(`test.svg`).getDownloadURL().catch((err) => {
                          if(err?.code_ === "storage/quota-exceeded"){
                            this.setState({
                              healthyStorageConnection: false
                            })
                            this.notify("Today's quota has been expired. Please come back tomorrow. All users have only 1GB/day for media browsing which is extremely little but with your donations, we can subscribe to a better plan which gives more storage and browsing count. However, you still can chat, follow, like, comment, and more without viewing the contents of others.", "error");
                          }
                        })
  }
  convertSpeech = ({ type, action, phrase }) =>{
   return new Promise((resolve, reject) => {
     if(type === "tts" && phrase){
      let txtToSpeech = null;
      if(new SpeechSynthesisUtterance()){
              txtToSpeech = new SpeechSynthesisUtterance();
              txtToSpeech.text = phrase;
              txtToSpeech.pitch =1;
              txtToSpeech.volume =3;
              txtToSpeech.rate =0.9;
              if(speechSynthesis){
                  speechSynthesis.speak(txtToSpeech);
                  resolve();
              }else{
                reject();
              }
      }else{
        reject();
      }
     }else if(type === "stt" && action){
        window.SpeechRecognition = (window.SpeechRecognition || window.webkitSpeechRecognition);

        if("SpeechRecognition" in window &&  window.SpeechRecognition){
            let recognition = new window.SpeechRecognition();//enables speech recognition

            const endListening = () => {
              recognition.stop();
              this.setState({
                    pauseMedia: false,
                  })
            }
            if(action === "start"){
                recognition.start();//starts the service
                recognition.onerror= event =>{
                  reject("");
                  this.notify((event?.error === "not-allowed" ? "Voice search is turned off. Please allow access to microphone in order to use this feature." : event?.error), "error");
                }
                recognition.onstart = () => {
                  this.setState({
                    pauseMedia: true,
                    isVoiceSearching : false
                  });
                }
                recognition.onresult = event =>{
                  resolve(event.results[0][0].transcript || "");
                }
                recognition.onend = () =>{
                  endListening();
                }
            }else if(action === "stop"){
               endListening();
            }
            
          }else{
              reject("");
              this.notify("Speech recognition is not compatible with your device/browser. Google Chrome on a modern device is recommended.", "error");
          }
     }

    });     
  }
  handleRealTimeState = (path) => {
    return new Promise((resolve, reject) => {
        if(this.state.receivedData && Object.keys(this.state.receivedData).length > 0){
        firebase?.database() && firebase.database().ref(path).once('value').then((snapshot) => {
            resolve(snapshot?.val());
          }).catch(() => {
            reject([]);
          });
      }else{
        reject([]);
      }
    })
  }
  handleThemeChange = (selectedTheme) => {
    if(selectedTheme && (selectedTheme !== this.state.receivedData?.profileInfo?.theme)){
        const profileInfoCopy = JSON.parse(JSON.stringify(this.state.receivedData?.profileInfo));
        profileInfoCopy.theme = selectedTheme;
        this.updateParts(this.state.uid, "profileInfo",profileInfoCopy, true, "");
    }
  }
  updateRealTimeData = ({path, objName, newVal}) => {
    const refToDatabase = database.ref(path);
    const objectToSubmit = {
      [objName]: newVal
    }
    refToDatabase.update(objectToSubmit);
  }
  openReel = ({ reelId, groupId, reelUid }) => {
   return new Promise((resolve, reject) => {
     if(reelId && groupId && reelUid ){
          this.updateReelsProfile(reelUid).then((res) => {
                          //checks indices
                          const checkGroupIndex = res?.reels?.length > 0 && res?.reels?.map(el => el.id).indexOf(groupId);
                          if(checkGroupIndex !== -1){
                              const checkReelIndex = res?.reels[checkGroupIndex]?.reelItems?.map(item => item.id).indexOf(reelId);
                              if(checkReelIndex !== -1){
                                resolve();
                                const reelTimeout = setTimeout(() => {
                                  this.setState({
                                    currentReel:{groupIndex: checkGroupIndex , groupId: groupId, reelIndex: checkReelIndex, reelId: reelId }
                                  })
                                  window.clearTimeout(reelTimeout);
                                },100);
                              }else{
                                reject();
                                this.notify("Reel is not available or got deleted","error");
                              }
                          }else{
                            reject();
                            this.notify("Reel is not available or got deleted","error");
                          }
            }).catch(() => {
              reject();
            })
     }else{
       reject();
     }
    });
  }

  mutateLoadingState({key, val}){
    if(key && typeof val !== "undefined"){
      this.setState({
        loadingState: {...this.state.loadingState, [key] : val }
      }) 
    }
  }
  handleVoting({voteState,postOwnerId, postId, answerId}) {
      return new Promise((resolve, reject) => {
        if(postOwnerId && postId && answerId){
          db.collection(Consts.USERS)
          .doc(postOwnerId)
          .get()
          .then((res) => {
            const {
              posts= []
            } = res?.data();
            if(posts.length > 0){
              const postsCopy = JSON.parse(JSON.stringify(posts));
              const postIdx = postsCopy.map(postItem => postItem.id).indexOf(postId);
              
              if(postIdx >= 0 && postsCopy[postIdx]?.pollData?.answers){

                const answers = Object.values(postsCopy[postIdx].pollData.answers);
                const answerIdx = answers.map(answerItem => answerItem.id).indexOf(answerId);
                
                const myUID = this.state.receivedData?.uid;
                    if(answerIdx >=0 && answers?.every(item => item.hasOwnProperty("votes"))){ 
                        let votesArr = answers[answerIdx]?.votes;
                        if(voteState){
                          // vote
                          answers?.length > 0 && answers.forEach( el => {
                              const myVoteIdx = el.votes.map(voteItem => voteItem).indexOf(myUID);
                              if(myVoteIdx >=0 ){
                                el.votes.splice(myVoteIdx, 1);
                              }
                          });
                          votesArr.push(myUID);
                          answers[answerIdx].votes = [...new Set(votesArr)];
                        }else {
                          // unvote
                          if(votesArr.some(voter => voter === myUID)){
                            const myVoteIdx = votesArr.length > 0 ? (votesArr.map(voter => voter).indexOf(myUID)) : -1;
                            if(myVoteIdx >=0){
                               votesArr.splice(myVoteIdx, 1);
                            }else{
                              this.notify(`An error occurred. Please try again later.`,"error");
                              reject();
                            }
                            
                          }else{
                            this.notify(`An error occurred. Please try again later.`,"error");
                            reject();
                          }
                        }
                        this.updateParts(postOwnerId, "posts", postsCopy, false, "").then(() => {
                          resolve();
                        }).catch(() => {
                          reject("");
                        });
 
                    }else{
                      this.notify(`An error occurred. Please try again later.`,"error");
                      reject();
                    }
              }else{
                this.notify(`An error occurred. Please try again later.`,"error");
                reject();
              }
            }else{
              reject();
            }
          }).catch((err) => {
            this.notify(`${err?.message || "An error occurred. Please try again later."} `,"error");
            reject();
          })
        }else{
          reject();
        }
      });
  }
  // isNudePic = ({node, imageURL}) => {
  //   store.dispatch({type: actionTypes.UPDATE_SCANNING_FOR_NUDITY, newState: true});
  //   return new Promise((resolve, reject) => {        
  //       let downloadedImg = new Image();
  //       const imageReceived = () => {  
  //               window.nude.load(downloadedImg);
  //               window.nude.scan(function(result){  
  //                   resolve(result);
  //                   store.dispatch({type: actionTypes.UPDATE_SCANNING_FOR_NUDITY, newState: false});
  //               });
  //       }
  //       const onError = () => {
  //         store.dispatch({type: actionTypes.UPDATE_SCANNING_FOR_NUDITY, newState: false});
  //         reject();
  //       }
  //       downloadedImg.crossOrigin = "Anonymous";
  //       downloadedImg.addEventListener("load", imageReceived, false);
  //       downloadedImg.src = imageURL;
  //       downloadedImg.addEventListener("error", onError,false)
  //   });
  // }
  cleanseText = (text) => {
    const filter = new FilterWords({list: extraCurseWords, firstLetter: true});
    return (text && typeof text === "string") ? filter.clean(text) : '';
  }
  render() {
    return (
      <AppContext.Provider
        value={{
          //states
          ...this.state,
          addPost: this.addPost.bind(this), //functions
          generateNewId: this.generateNewId.bind(this),
          updatedReceivedData: this.updatedReceivedData.bind(this),
          updateUserState: this.updateUserState.bind(this),
          updateUID: this.updateUID.bind(this),
          deleteContentFromFB: this.deleteContentFromFB.bind(this),
          handleSubmittingComments: this.handleSubmittingComments.bind(this),
          getUsersProfile: this.getUsersProfile.bind(this),
          changeMainState: this.changeMainState.bind(this),
          handlePeopleLikes: this.handlePeopleLikes.bind(this),
          updateParts: this.updateParts.bind(this),
          resetAllData: this.resetAllData.bind(this),
          handleSubComments: this.handleSubComments.bind(this),
          handleLikingComments: this.handleLikingComments.bind(this),
          authLogout: this.authLogout.bind(this),
          handleFollowing: this.handleFollowing.bind(this),
          handleSendingMessage: this.handleSendingMessage.bind(this),
          initializeChatDialog: this.initializeChatDialog.bind(this),
          closeNotificationAlert: this.closeNotificationAlert.bind(this),
          deletePost: this.deletePost.bind(this),
          handleEditingProfile: this.handleEditingProfile.bind(this),
          notify: this.notify.bind(this),
          confirmPrompt: this.confirmPrompt.bind(this),
          returnPassword: this.returnPassword.bind(this),
          changeProfilePic: this.changeProfilePic.bind(this),
          searchUsers: this.searchUsers.bind(this),
          handleUserBlocking: this.handleUserBlocking.bind(this),
          onCommentDeletion: this.onCommentDeletion.bind(this),
          handleReelsActions: this.handleReelsActions.bind(this),
          updateReelsProfile: this.updateReelsProfile.bind(this),
          unsendMessage: this.unsendMessage.bind(this),
          deleteChat: this.deleteChat.bind(this),
          handleChangingSort: this.handleChangingSort.bind(this),
          handleSavingPosts: this.handleSavingPosts.bind(this),
          closeNewMsgNoti: this.closeNewMsgNoti.bind(this),
          handleFollowRequests: this.handleFollowRequests.bind(this),
          handleUnfollowingUsers: this.handleUnfollowingUsers.bind(this),
          testStorageConnection: this.testStorageConnection.bind(this),
          convertSpeech: this.convertSpeech.bind(this),
          handleRealTimeState: this.handleRealTimeState.bind(this),
          handleThemeChange: this.handleThemeChange.bind(this),
          updateRealTimeData: this.updateRealTimeData.bind(this),
          openReel: this.openReel.bind(this),
          mutateLoadingState: this.mutateLoadingState.bind(this),
          handleVoting: this.handleVoting.bind(this),
          cleanseText: this.cleanseText.bind(this)
        }}
      >
        {this.props.children}
      </AppContext.Provider>
    );
  }
}
const AppConsumer = AppContext.Consumer;

export { AppProvider, AppContext, AppConsumer };