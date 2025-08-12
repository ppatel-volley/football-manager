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

A user can instruct their team to 'defend' which will cause the players to rarely venture out of their half and make it very difficult, but not impossible, for the opposition to score. The downside for this action is that it would be very difficult for the users team to score a goal as well.

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




