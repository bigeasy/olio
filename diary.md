## Thu Feb  7 17:03:52 CST 2019

Had a go at using the Prolific Evaluator to allow for using JavaScript functions
in properties. This would make it simpler to specify functions to children that
are complete except for a little bit of customization. The selector function to
Inlet UDP and Inlet TCP are what got this started.

Right at the outset, though, I hit problems. Instead of providing JSON, you
create a builder function that generates JSON. We already do this for production
invocation and we're saying we want to do it for Mocks as well. It's just the
way things are done. It means we can send the source to the children and the
children can re-evaluate it.

But, the JSON describes all the children, and the properties of the process
itself like the socket path, so do we constantly regenerate the entirely? That
starts to sound like it has more side effects than it is worth, just to create a
copy of a function, for a single instance.

It's subtle though. We still have the evaluation like in Prolific, but we are
producing this different result. Prolific really wants to build a function,
something that will do work, whereas here we only really want a configuration.
Prolific is slightly more homogeneous. All the monitors are going to have the
same code, we're basically forking the code, and all the monitored are going to
have the same triage. Here we have a tree with bits for the root and different
configurations for different children.

Thus, it is similar but not quite worth it to add the evaluation.
