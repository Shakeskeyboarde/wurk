# The Motivation for Wurk

I'm going to tell a story about how I ended up writing Wurk.

First, a disclaimer. The views here are my own, and you do not need to share them. I'm not trying to convince you of anything. I'm just telling my story.

## TL;DR

- I like NPM and PNPM... as package (not monorepo) managers.
- I do not like Yarn for anything (too many wtf/m).
- NPM and Yarn don't have sufficient monorepo management features.
- PNPM is 79% good enough, but still not quite there for monorepos (for me).
- Lerna was good, but is now Nx-centric (Nrwl), which is not.
- Tried other monorepo management tools: Rush, Bit, Turborepo, and Nx.
  - Over-engineered (for me, and probably many others).
  - Too much lock-in.
  - Not extensible.
- Lerna-Lite would once have been good enough, but now I want extensibility.

Wurk is a lightweight, extensible, monorepo management tool.

## NPM

When I first started using Node.js in about 2011 (v0.4.x), NPM had just been released, and it seemed like one of the nicest package managers I'd ever seen. The `node_modules` solution to incompatible transitive dependency versions was genius! It was an easy algorithm to understand and very transparent. I can go find the source to anything I'm depending on, right there in my project directory. I can even selectively use _parts_ of packages.

I'd never heard of a monorepo. I'm sure they existed, but they hadn't entered my circle of awareness yet. I had used SVN, Mercurial, and Git, but each to manage single projects. Some of those projects were large enough they probably should/could have been monorepos, but we didn't think of them that way, even when they contained things like Visual Studio workspaces with multiple projects.

It wasn't until many years later that I saw heavy use of Monorepos and had to use one myself.

## Lerna

The first monorepos I worked with used Lerna, and I became a long time [Lerna](https://lerna.js.org/) user. At some point we started using Yarn underneath Lerna, because could type `yarn build` to run the package `build` script, instead of having to type a whole extra 4 characters (` run`). Also, for a long time NPM didn't have the ability to force package resolutions to address vulnerabilities in outdated transitive dependencies, which is probably a better reason.

Unfortunately (for me), it changed hands to [Nrwl](https://github.com/lerna/lerna/issues/3121), the publishers of [Nx](https://nx.dev/). Nrwl really wanted to use it as a front for Nx, which is not what I wanted. You don't _have_ to use Nx, but I don't want to relay on the future of a project that has different goals than I do. It's only a matter of time until some things aren't possible unless you're using Nx, or Nx becomes mandatory.

## Yarn without Lerna

Next, I used [Yarn v1 (AKA: classic)](https://classic.yarnpkg.com/en/) without Lerna. We'll talk about v2+ in a minute.

Yarn v1 by itself has Workspace support that is "good enough". It can't run scripts in parallel or in dependency order. But, the workspace order was configurable by how the `packages` field was defined in your `package.json` file. I used other tools for versioning. I just publishing all workspaces and ignored the ones that failed, because it was probably just published already (right? right!? oof).

But, then it became clear that Yarn v1 had some workspace dependency management bugs. Instead of fixing them in v1, Yarn decided to go for a full rewrite in v2. That wouldn't have been so bad, except they also decided that in addition to code cleanup and bug fixes, they were going revamp package management completely in the form of [PnP](https://yarnpkg.com/features/pnp). Again, you don't _have_ to use PnP with Yarn v2+, but opting out has a poor chance of getting the support I want in the future.

Why I don't like Yarn PnP is a whole other story. At the time, it was not well supported by the other tools I wanted to use (eg. Webpack). Now it is, but I still think of it as a hack, and there are still annoyances.

Yarn v2+ also decided they didn't want to be subordinate to NPM. This was expressed partly in the move to Yarn PnP. They also stated openly that they were not willing to commit to future compatibility (or even cooperation?) with NPM. You may have different feelings about that, but I viewed it as divisive, imperious, and even a bit naive. Another way this attitude displayed itself was in their installation instructions. Yes, you could/can use NPM to install Yarn, but please don't, they don't like it when you do that.

Yarn did eventually collaborate with NodeJS to develop [Corepack](https://nodejs.org/api/corepack.html), which is the new way of installing Yarn. But, it's experimental (at the time of this writing). That's a feeling I get a lot with Yarn: that I'm an early adopter, on the bleeding edge, alpha channel, being experimented on. This isn't just about newness, it's about the attitude of the maintainers. I don't want to be a guinea pig.

## Back to NPM

When Yarn v2 was released, I took another look at NPM.

NPM added support for most of the things I had been using Yarn v1 for. Unlike Yarn, they actively acknowledged that they valued and wanted to work with other package management projects. They learned from them, and got better. They also maintain the public registry, which sort of gives them a leg up on the competition.

NPM had _not_ added anything for workspaces beyond what Yarn v1 had. But when compared to Yarn v1, NPM now was the clear winner. While Yarn v2+ did add more complete workspace support (workspaces foreach), I still didn't want to use it for the reasons I mentioned above.

So, since Yarn v1 was essentially deprecated, I made the switch back to NPM. It had basic feature parity with Yarn v1, and I removed an extra tool from my toolchain. I continued to just write my own solutions around NPM to manage monorepos.

### But what about PNPM?

While I was looking for an alternative to Yarn v2, I found also [PNPM](https://pnpm.io/), which is an awesome project. I didn't immediately adopt it, because the linking strategy it used seemed risky. And, I think at the time I was correct in that assessment.

Today (v8), the wrinkles in the dependency linking strategy have (mostly) been resolved, and [Corepack](https://nodejs.org/api/corepack.html) makes adoption super simple.

However... Its monorepo management is _still_ not quite there for me. Don't get me wrong, It's good. But, it's still missing extensibility. It actually doesn't have versioning (release) support built-in either. Instead it recommends using [Changesets](https://www.npmjs.com/package/@changesets/cli), which is another solid (but not quite right for me) choice. And finally, it's workspace command design and log output seem... unpolished at best, and confusing at worst.

I don't think this is actually a lack in PNPM. Rather, I think it's actually too much to ask of a package manager. It's the one place where I think PNPM went wrong, in offering it at all. Like NPM and Yarn, it should have stuck to providing the low level API for other tools to build off of.

There are also still some gotchas with package deduplication. They exist in Yarn too, FWIW. Both package managers will keep multiple versions of dependencies around to avoid changing transitive dependency resolutions. This is supposed to be "safer", but IMHO causes more problems than it solves.

## And Others

I won't claim to have used every monorepo management option out there. But I've used a few, and there are reasons I never used them long, or for more than experiments.

[Rush](https://rushjs.io/), [Bit](https://bit.dev/), [Turborepo](https://turbo.build/), and Nx, are the other tools I've looked at for better monorepo management. My complaint about all of them can be summarized as: Does too much, and not transparently enough. Your mileage may vary.

Build caching and incremental builds are common features of these tools. But, in my experience the time savings isn't worth the complexity and fragility.

More efficient dependency management is also a feature in some of these tools, similar to PNPMs efficiency enhancements. But, PNPM is already the better option there.

## Lerna-Lite Appears

What's this? Someone else didn't really want to jump on the Lerna+Nx/Nrwl train? I'm not alone!? Honestly, it feels like every developer is an island sometimes. Can't we agree on _anything?_

[Lerna-Lite](https://github.com/lerna-lite/lerna-lite) is for the people who were perfectly happy with Lerna before it was acquired. Not only is it exactly the Lerna we loved, but it's modular (kind of), in that you install only the commands you need.

The problems with Lerna-Lite are honestly small and I could use it. However, I wouldn't use the `version` or `publish` commands.

I wouldn't use the `version` command, because it uses the very common practice of tracking releases with Git tags. I have never liked this strategy.

I also don't think the `publish` command is safe enough. In all that time I was writing my own monorepo management scripts around vanilla NPM and Yarn v1, one of the things I kept writing was pre-publish validation. For instance, I don't want to publish if my `package.json` file references build artifacts that don't actually exist. The other monorepo management tools have tried solving this by also becoming CI services (not just tools). But, I think they've gone too far.

Lerna-Lite being modular and allowing me to keep those commands from even being available to a project, is a really nice improvement over original Lerna. But, even though it's modular, it's not actually extensible. The author broke the original code up into separate command packages, but there isn't a plugin architecture designed to allow for new/alternative commands that were not originally part of Lerna. So, I if I want to add my own version and publish solutions, they have to be separate tools. Again, workable, but it would be better if I could have replaced the Lerna commands.

Lerna-Lite was originally forked from Lerna (I believe). While that makes sense from a speed of development perspective, it does show some signs of left-overs from Lerna. And Lerna was grown in the days when not all package managers had the concept of workspaces. So, I think a fresh start is in order.

## Therefore, Wurk

Basically, I want Lerna-lite, but built from the ground up to be extensible. That way, when I (or others) are not happy with the way a command works, a low overhead (maybe even custom) alternative is possible.

Having a single _extensible_ management tool is also useful beyond providing a lot of functionality in one place. It makes commands discoverable and declarative. Discoverable because I know that every/most commands I need to run are a `wurk` commands, and I can get help for them with `wurk [command] --help`. Declarative because I can run something like `wurk publish` in two different projects, and the implementations might be different but correct for each project.
