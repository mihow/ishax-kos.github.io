function adjust() {
	
	var size = document.querySelector(".page").clientWidth;
		size = (window.innerWidth - size)/2;
	
	var vis = "visible";
	
	if (size < 200) {
		vis = "hidden";
		//size = 0;
	}
	else {
		size *= 0.99;
		size -= 18.0;
	}
	
	for (item of document.querySelectorAll(".menuSide")) {
		item.style.cssText = (
			"width: "+ (size) +"px; visibility:"+ vis +";"
		);
	}
} adjust();


var headings = document.querySelectorAll("h1,h2,h3,h4");
var navList = document.querySelector("#navList");
var n = "";
for (i = 0; i < headings.length; i++) {
	if (headings[i].id == "") {
		n = headings[i].innerHTML;
		headings[i].id = "r"+i;
	} else {
		n = headings[i].id
	}
	if (headings[i].className != "nullMenu") {
		navList.innerHTML += "<a href=\"#"+ headings[i].id +"\"><"+ headings[i].tagName +">"+
		n 
		+"</"+ headings[i].tagName +"></a>";
	}
}
