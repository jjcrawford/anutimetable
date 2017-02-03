
function TimetableObj(rawLessonsData) {
	this.courseObjects = [];

	var superstructure = []; //course id, event group id, event id, lesson as return
	
	var courseEventGroupTypes = []; //course name, event group name as key, event group id as return
	var courseEventGroupEnum = []; //course name, event group id as key, event group name as return;

	var courseTypes = []; //course name as key, course id as return
	var courseEnum = []; //course id as key, course name as return
	
	this.eventGroupList = []; //used for permutations!
	
	this.count = function() {
		var c = 0;
		for (i = 0; i<this.courseObjects.length; i++){
			c+=this.courseObjects[i].count();
		}
		return c;
	};
	
	this.permute = function(){
		var c = 1;
		for (count = 0; count<this.courseObjects.length; count++){
			c*=this.courseObjects[count].permute();
		}
		return c;
	};
	
	this.pickPermutation = function(index) {
		if (this.eventGroupList.length==0) { //compile a list of event groups
			for (n = 0; n<this.courseObjects.length; n++){
				evtGrps = this.courseObjects[n].eventGroupObjects;
				for (m=0; m<evtGrps.length; m++){
					this.eventGroupList.push(evtGrps[m]);
				}
			}
		}
		
		var pickedLessons = [];
		var prevBase = 1;
		
		var numlist = [];
		
		for (grpN=0; grpN<this.eventGroupList.length; grpN++){
			var evts = this.eventGroupList[grpN].eventObjects;
			var thiscount = this.eventGroupList[grpN].count()
			pickedLessons.push(evts[Math.floor(index/prevBase)%thiscount]);
			numlist.push(Math.floor(index/prevBase)%thiscount);
			prevBase*=thiscount;
		}
		
		return pickedLessons;
	}

	_(rawLessonsData).each(
		function (lesson) {
			var courseName = lesson.name;
			var eventGroupName = filterNumbers(lesson.info);
			var eventName = lesson.info;
			
			if (courseTypes[courseName] === undefined) { //register unencountered courses
				courseTypes[courseName] = Object.keys(courseTypes).length;
				courseEnum[courseTypes[courseName]] = courseName;
				
				
				courseEventGroupTypes[courseName] = [];
				courseEventGroupEnum[courseName] = [];
				
				superstructure[courseTypes[courseName]] = [];
			}
			if (courseEventGroupTypes[courseName][eventGroupName] === undefined) { //register unencountered eventgroups
				courseEventGroupTypes[courseName][eventGroupName] = Object.keys(courseEventGroupTypes[courseName]).length;
				courseEventGroupEnum[courseName][courseEventGroupTypes[courseName][eventGroupName]] = eventGroupName;
				
				superstructure[courseTypes[courseName]][courseEventGroupTypes[courseName][eventGroupName]] = [];
			}
			superstructure[courseTypes[courseName]][courseEventGroupTypes[courseName][eventGroupName]].push(lesson);
		}
	);

	for (c = 0; c<Object.keys(courseTypes).length; c++){
		var courseName = courseEnum[c];
		this.courseObjects.push(new CourseObj({courseName : courseName, evtGrps :  superstructure[courseTypes[courseName]], evtGrpEnum : courseEventGroupEnum[courseName]},this));
	}
}

function CourseObj(data, ttObj) {
	this.parent = ttObj;
	this.eventGroupObjects = [];
	this.name = data.courseName;
	
	this.count = function() {
		var c = 0;
		var i = 0;
		for (i = 0; i<this.eventGroupObjects.length; i++){
			c+=this.eventGroupObjects[i].count();
		}
		return c;
	};
	
	this.permute = function(){
		var c = 1;
		for (i = 0; i<this.eventGroupObjects.length; i++){
			c*=this.eventGroupObjects[i].count();
		}
		return c;
	};
	
	var evtGrps = data.evtGrps;
	var evtGrpEnum = data.evtGrpEnum;
	
	for (eg = 0; eg < evtGrps.length; eg++) {
		var evtGrpName = evtGrpEnum[eg];
		this.eventGroupObjects.push(new EventGroupObj({eventGroupName : evtGrpEnum[eg], evts : evtGrps[eg]},this));
	}
}

function EventGroupObj(data, courseObj) {
	this.parent = courseObj;
	this.eventObjects = [];
	this.name = data.eventGroupName;
	

	this.count = function() {
		return this.eventObjects.length;
	};
	
	
	var evts = data.evts;
	
	for (evt = 0; evt < evts.length; evt++){
		this.eventObjects.push(new EventObj(evts[evt],this));
	}
	
	this.chosenIndex = -1;
}


function EventObj(item, evtGrpObj){
	this.parent = evtGrpObj;
	this.name = item.info;
	this.start = item.start;
	this.dur = item.dur;
	this.end = item.start + item.dur;
	this.day = item.day;
	this.dayIndex = item.dayIndex;
}

var isConflict = function(evt1, evt2) { //checks to see if two events occur at overlapping times
	if(evt1.day == evt2.day){
		if ((evt1.start >= evt2.start && evt1.start < (evt2.start+evt2.dur)) || ((evt1.start+evt1.dur) > evt2.start && (evt1.start+evt1.dur) <= (evt2.start+evt2.dur))) {
			return true;
		}
	}
	return false;
}


var resolveConflicts = function () {
	var lessonsSet = [];
	for(i=0; i<Course.courses.length; i++){
		var courseName = Course.courses[i];
		var data = timetableData[courseName];
		_(data).each(
				function (group) {
					if (group[0] === 'group') {
						lessonsSet.push(group[1][0]);
					}
				}
			);
	}
	
	var tt = new TimetableObj(lessonsSet);

	var nonconflictPermutations = [];
	var numpermutations = tt.permute();
	//alert(numpermutations);
	
	for (pc = 0; pc < numpermutations; pc++){
		var trialset = tt.pickPermutation(pc);
		var conflict = false;
		for (p=0; p<trialset.length-1; p++){
			//console.log("new trial!");
			for (k=p+1; k<trialset.length; k++){
				if (isConflict(trialset[p], trialset[k])) {
					conflict = true; 
					//console.log("Conflict: " + trialset[p].parent.parent.name + " " + trialset[p].name + " and " + trialset[k].parent.parent.name + " " + trialset[k].name);
				} //else 	console.log("NO Conflict: " + trialset[p].parent.parent.name + " " + trialset[p].name + " and " + trialset[k].parent.parent.name + " " + trialset[k].name);

			}
		}
		if (conflict==false) {
			//console.log("nonconflict!");
			nonconflictPermutations.push(trialset[pc]);
		} //else console.log("conflict!");
	}
	console.log("finished! there were " + nonconflictPermutations.length + " non-conflict variations out of " + numpermutations + " total permutations");
}