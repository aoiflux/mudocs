---
title: "Data Types"
date: 2021-03-29T01:02:12+05:30
draft: false
weight: 5
---

[Mutant](https://github.com/aoiflux/mutant) programming language supports
following data types: The language is loosly typed and it does not require
defining specific data types while creating variables.

###### Primitive Types

- **string**: Strings in [Mutant](https://github.com/aoiflux/mutant) are UTF-8
  encoded strings. A string in mutant is a read-only list of bytes. While mutant
  does not support bytes natively as of this release, it is closely tied with
  how [Go](https://golang.org) treats its bytes and strings.

- **integer**: All integers in [Mutant]https://github.com/aoiflux/mutant] are
  treated as 64 bit signed integers

- **bool**: All bools in [Mutant](https://github.com/aoiflux/mutant) are simple
  objects that are treated as either true or false

###### Complex Types

- **list**: Lists in [Mutant](https://github.com/aoiflux/mutant) are
  heterogenous arrays that can store variables of multiple, supported primitive
  data types

- **hashMap**: HashMap in [Mutant](https://github.com/aoiflux/mutant) are
  associative data types. They are key value pairs.
