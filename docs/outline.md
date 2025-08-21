*OUTLINE*

This is the outline of the project.

We are building a voice controlled game of football (i.e. soccer).

The full rules of the sport can be found here (follow the links for each rule!) and should be read and understood to implement the PRD: https://en.wikipedia.org/wiki/Laws_of_the_Game_(association_football)

**The Game**

- This game will have 2 teams playing football in a top-down view of the pitch

- There is a referee who positions himself to see fouls and match progression. He has a whistle that he blows to start and stop the game. Research and list the times when this should be done

- There are two teams of 11 players, playing against each other with local AI controlling the actions of the players. The roles of the players will be one of goalkeeper, defender, midfielder or attacker. Note that there are sub-roles such as attacking wingback or winger I want you to research and understand for the PRD. Each team can have up to 5 subsitutes, which can be a mixture of players (attackers, defenders etc).

- Each player has ratings for attack, defence, ball control, shot power, strength, stamina etc. Use stats that might be used in a sports role playing game to determine some more attributes for a player. Each player also has a name.

- The result of a player action are influenced by their stats. For example, the accuracy of a shot towards goal and the probability of scoring would be affected by their shot power, attack and ball control attributes (and perhaps others too).

- A human player will be able to instruct their team to adopt a style of play or carry out certain actions.


**Styles of play**

***Defend***

A user can instruct their team to 'defend' which will cause the players to rarely venture out of their half and make it very difficult, but not impossible, for the opposition to score. The downside for this action is that it would be very difficult for the users team to score a goal as well.

***Balance***

A user can instruct their team to be 'balanced' which will allow the team to search for opportunites to score but not at the expense of leaving themselves vulnerable to attack.

***Attack***

A user can instruct their team to 'attack' which will cause the players to aggresively venture out of their half and try to score a goal. The downside for this action is that it would leave them vulnerable in defense.

***Other***
Note that the user can also give other instructions that will influence their team including:
- "Watch the left/right!" the team will watch out for attacks from the opposition on the left/right flank

- "Shoot!" the ball possessor will attempt a shot on goal

- "Close him down!" suitable player from your team will try and get the ball off the opposition team

- "Get it up the pitch!" the ball possessor on the users team will kick the ball upfield and potentially out of bounds. This is in situations where their team is being overwhelmed by the opposition or they want to run the clock down to the end of the game.

Note that there might be other phrases which should be interpreted and mapped to an action for the team.


**The Match**
For this game, each match will be two halves of 45 minutes with extra time added at the end of each half due to stoppages. The clock will be accelerated so the game only lasts a total of 5 minutes in real time.

The winner of a game is the team that scores the most goals.

Additions since you made the PRD:

- A user can play in All teams go into a league of 28 teams. The league is played over the course of a week. The top two teams get "promoted" to the next league up. This gives a team virtual cash to spend on better players. This will be added once the main game is complete.

- Users can buy and sell players but this will be added once the main game is complete.

- Player stats for each category go from 0.0 to 10.0. There is also an overall 'rating' that summarises how good a player is.

- Each team has a captain who is usually once of the best rated players on the team, if not the very best player.

- Game is free to play

- Game is played on a web page which will be displayed on a FireTV or other web supporting TV device

- Each team also has a name. You can use team names from the English League and Premier League for inspiration for the ones for this game. Players can also make up their own team names.

- When a player first plays the game, their team and players will be generated for them. They will start off in a league which has the quality of the English National League. Their players will be far from the best. See more here: https://en.wikipedia.org/wiki/English_football_league_system  We will add this feature once the main mechanics of the game are done.






# System design

***v1.1***

The architecture of the software should be roughly as follows:

## App Manager
This is the top level of the application. It will handle the current global state such as showing the front end or playing the game, or something else we will add later.

### FrontEnd Manager
This is the major class will show things like the title screen and also allow users to select what type of game they want to play, team customisation, etc

### Game Manager
This is what will run the game of football. There are multiple states it will need to handle:

#### PreMatch
Here the players will walk onto the pitch and take their positions. The crowd from both teams will be cheering on their teams. The commentary will be talking about both teams and hoping for a good game.
 The side of the pitch the teams will be on is selected at random.

#### Kick Off
One of the teams will be selected at random to kick off. Both teams will be in their starting positions.

#### First Half
The team that is kicking off will start by kicking the ball once the referee blows his whistle.

#### Half Time
Once 45 minutes (plus any time added on by the referee) has elapsed the whistle will be blown for half time. The players will walk off the pitch and the front end will display some statistics about the first half. This period should last no more than 1 minute in real time

#### Second Half
The team that didn't kick off the first half will be kicking off the second half by kicking the ball once the referee blows his whistle.

#### Full Time
This is the end of the game. A UI will display the stats from the whole game before exiting the match.

### Notes
During the game the rules of association football (soccer) will apply. This includes, throw ins, penalties, corners, goal kicks, free kicks etc. Each of these should be a state which the game manager controls that, once complete, transitions back to the playing state in the GameManager. Note that we should instantaneously move players into the required positions for each of these 'dead ball' situations so we can get back to the playing state ASAP.

### In Game Head Up Display (HUD)
This displays the current score, the names of the teams and the current time. It will also bring up text in very large letters saying "GOAL!" when a goal is scored. It will display text in not-so-large letters for kick off (with text for 1st or second half), free kicks, throw ins and penalties.

### The ball
While the game will be presented in 2D, the ball will be using 3D physics of sorts. It will use 2D scaling for the sprite so it appears bigger when in the air to give the illusion it's above the ground. A drop shadow will add to this illusion.
 When the ball is kicked, we will calculate the landing position. This position wil let us compute the grid square (from the formation editing tool) that the ball will land in. The players from both teams will use that square (or cell) to determine what position they should be in according to the formation data.

### Player kick types
-Regular Pass: The most basic pass to a teammate. This is along the ground and can be long or short.
-Lobbed Pass: Sends the ball through the air to a target player.
-Through Ball: Threads the ball through the defense for a teammate to run onto.
-Driven Pass: Used to connect plays from defense to attack or to find a striker in the box from the wing. Requires a good angle toward the receiver.
-Cross also known as a whipped pass: A type of cross with added curve. Most often completed successfully by players with high stats and are attacking minded. Usually carried out from the wing to send the ball towards the goal area for a waiting striker to attempt a shot on goal.

### Player positioning
The players will use a number of factors to detemine their *desired* position. The AI will calculate each factor and each factor will be weighted and then summed to determine the final desired position. Here are the factors:

 0. Loose Ball: any time the ball is not in possession, the closest player to it from a team will aim to take possession. The actions the player takes once taking possession will depend on the circumstances. If a defender takes possession in his teams goal area, he will try and pass to a team mate further up the pitch or he will just try and launch it upfield so the opposition can't score. An attacking player will aim to take possession in the opposition teams goal area to try a shot on goal or pass to an onside team mate to try and score a goal.

 1. Formation Data: Based on the position of the ball on the pitch, every player will have a position that they should be in. The exception is for the ball possessor who, according to their characteristics, will try to run upfield or pass to a team mate in a better position. Note: we need to calculate the 'betterness' of team mates we can pass to and determine the best one.

### Player action
For ball possessors who are not the goal keeper, we will run a check to determine the best course of action. We will analyse the following:
-If there is space ahead of the player to run towards the opposition goal
-If there is a player in the opposition penalty box we will attempt to pass to them via a cross/whipped pass

 ### Goal Keeper positioning
 The goal keeper position should be calulated by drawing a line from the centre point of the goal to the ball. The distance from the mouth of the goal that the keeper should position himself along this line is computed by the characteristics of the player (from his stats).

 ### Ball passing
 Football is a team sport and players will try and pass to team mates who are in a better position.

 Intelligent players will try and make through balls for their team mates who are in or running towards the opposition goal area.

 Defensive players will try and tackle opponents and pass the ball away to another team mate or into space as quickly as possible when they are close to their own goal. Mostly they will do medium to long range passes or head the ball away from goal. They may join in an attack and try to score goals too when their team is in an attacking posture.

 Midfield players are good mix of defending and attacking. They will typically try and stop the opposition getting too close to the defence and will also try and set up attacks by passing the ball upfield unless there are no options in which case they may play the ball sideways or back to their defence.  They are usually good at heading the ball too.

 Wingers will patrol the flanks of the pitch and be involved in defence or attack. Once in possession they will run up and try a cross into the area or a shot on goal.

 Strikers will aim to get into goal scoring positions and score goals whenever they can. They are shit at defending most of the time. They will takes shots on goal, cross the ball into the opposition area, head the ball towards goal etc.







