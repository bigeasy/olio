# TODO

- [ ] Change name `block` in error report of `Destructible`.
- [ ] Use `module.exports` instead of `exports.configuration` for configuration
of Olio.
- [ ] Create a test of constituent that doesn't fork constituents.
- [ ] Pass around program name and index?
    - [ ] Something to do with Olio, I believe.
- [ ] Adjust construction for program name.
- [ ] Async construction of processes.
- [ ] Consider renaming Olio to something like Confernece or Caucus. ~ Drawback
is that it is a long name, we already had subordinate, but Conference is a great
name. Long names are going to make documentation somewhat annoying. The name is
going to make the project more respectable. I don't have to have a section
describing the name.
- [ ] Create an Olio Orchesta.
    - [ ] Create an Olio Orchesta. ~ Something that lets you play around with
    multiple programs within a single Olio process to greatly simplify
    debugging.
- [ ] Olio should just log an error exit, not throw a stack trace. ~ Which means
you're not going to catch exceptions somewhere and winnow them down. That's not
happening. Catching exceptions is actually quite rare. Rarely do you actually
filter them out like that.
- [ ] Create HTTP interrogtation Olio child.
- [ ] Log process details from Olio supervisor.
- [ ] Capture failure to publish to child IPC in Olio.
- [ ] Assert that we are disconnected when the exit comes in Descendent in Olio.
