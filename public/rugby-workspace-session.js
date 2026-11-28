'use strict';
// Use the shared canonical session and sign-in return flow before workspace requests.
window.RugbyWorkspaceSession=Object.freeze({async require(){
 const session=await window.AuthNavigation.requireUser({returnTo:location.pathname+location.search+location.hash});
 if(!session.ok)throw Error(session.redirected?'Opening sign-in. You will return to this Rugby HQ page.':'Could not verify your session. Please retry this page.');
 return session;
}});
