Firebase CLI를 설치하려면  Node.js 및 npm이 이미 설치되어 있어야 합니다.이제 명령 프롬프트를 열고 npm을 통해 Firebase CLI를 설치합니다.
```shell
npm install -g firebase-tools
```
 

 

3. Vue 애플리케이션 배포
프로젝트를 구성하려면 먼저 빌드해야 합니다 . 배포해야 할 모든 항목이 포함된 dist 폴더가 생성됩니다.
그런 다음 Firebase에서 dist 폴더를 가리켜야 합니다. 그렇기 때문에 두 개의 구성 파일이 필요합니다.
```shell
npm run build
```
 

.firebaser라는 새 파일을 생성하여 다음과 같은 내용을 제공합니다. Firebase 프로젝트 아이디를 수정후 저정하고 닫아주시면 됩니다.
```json
{
  "projects":{
    "default" : "your-firebase-project-id"
  }
}
 
```

firebase.json 라는 다른 구성 파일을 만들어 보겠습니다 다음 내용을 추가합니다.
```json
{
	"hosting":{
		"public":"dist",
		"ignore": [
			"firebase.json",
			"**/.*",
			"**/node_modules/**"
		],
		"rewrites":[
			{
				"source":"**",
				"destination":"/index.html"
			}
		]

	}
}
```

 

응용프로그램을 배포하려면 먼저 로컬 컴퓨터를 Firebase 계정에 로그인하고 Firebase 프로젝트에 연동시켜야 합니다.  이렇게 하려면 다음을 실행합니다. 성공시 다음 이미지처럼 알림장이 나옵니다.
```shell
firebase login

npm run build && firebase deploy
```