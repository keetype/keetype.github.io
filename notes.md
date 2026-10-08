categories

- hall effect keyboards
  fetch from here:
  https://docs.google.com/spreadsheets/u/0/d/1RE3oq8_rLnmXhUCqya681PJXSbFBRTcT6tQeFjdJa3I/htmlview?pli=1#gid=491680755
- glass mousepads
  fetch from here:
  https://docs.google.com/spreadsheets/u/0/d/1RE3oq8_rLnmXhUCqya681PJXSbFBRTcT6tQeFjdJa3I/htmlview?pli=1#gid=0
- skates:
  - meant for cloth mousepads
    fetch from here:
    https://docs.google.com/spreadsheets/u/0/d/1RE3oq8_rLnmXhUCqya681PJXSbFBRTcT6tQeFjdJa3I/htmlview?pli=1#gid=1497121162
  - meant for glass mousepads
    fetch from here:
    https://docs.google.com/spreadsheets/u/0/d/1RE3oq8_rLnmXhUCqya681PJXSbFBRTcT6tQeFjdJa3I/htmlview?pli=1#gid=270660286
- mice
  coming soon
- cloth mousepads
  coming soon
- mx keyboards
  coming soon

implement tiles in authomatic grids, each showing the product in its category:

- for hall effect
  category (in a form of a tag)
  size (in a form of a tag)
  brand and model name
  performance tier (in a form of a tag)
  case material
  notes
  last update date
- for glass mousepads:
  category (in a form of a tag)
  brand and model name
  coating (in a form of a tag)
  notes
  availability (in a form of a tag)
- for skates:
  - skates meant for cloth mousepads:
    category (in a form of a tag)
    brand and model name
    material (in a form of a tag)
    format
    texture
    foam
    notes
- skates meant for glass mousepads:
  category (in a form of a tag)
  brand and model name
  material (in a form of a tag)
  format
  texture
  foam
  notes

make a simple GUI for all of this, I want to modify the visuals myself later on, keep it minimal for that purpose
add a fallback database that is easily editable in case the site cannot reach the google docs
make the google docs database the primary source, make it authomatically fetch. i need it to sync immediately
add a working search bar that suggests options from the database (so if i type in "Statice Seraph", it shows a popup of the product tile with every info)
add sorting to each category separately
separate cloth and glass skates in the sorting category, without filters on, show different speeds for each category together on one tile.
in each tile, leave space for a square preview of the product. if there is none, put a grey box with the product name in it. add placeholder for more than just 1 picture of the preview, but make it hidden unless there is more than 1 image attached.
add a text "No products found" when there are no products matching the filters or search query.
add a button that deletes all filters
add a text bar "showing x items in {category name}" above the tiles.
assign each product in the tile an ID tied to the model name collumn from the linked database in the google docs

i need those features modal and easily editable, preferably in different files to minimize clutter. keep it organized:
override-able information based on the ID's of the product, allowing me to manually override information like the images, categories, notes, everything else.
i need a button to assign a refferal link to and a button to authomatically copy my refferal code using the ID feature.
UI must be modal too, changed separately, kept simple so i can change it myself
everything in the backend like fetching must be clear and easily editable, preferably in different files to minimize clutter. keep it organized:
i want to be able to see which database is currently being used
i want to be able to change which database is currently being used
i want to be able to easily add other {coming soon} categories in the future, following the same filing structure
