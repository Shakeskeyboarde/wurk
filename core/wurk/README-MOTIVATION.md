# The Motivation for Wurk

I'm going to tell a story about how I ended up writing Wurk.

First, a disclaimer. The views here are my own, and you do not need to share them. I'm not trying to convince you of anything. I'm just telling my story.

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

A side note and honorable mention for [PNPM](https://pnpm.io/).

While I was looking for an alternative to Yarn v2, I found PNPM. Actually, I'd heard about it before, but it seemed more fringe, and I didn't deeply investigate it. What I discovered is that PNPM is an awesome project. I could easily see using PNPM in the future, if any of the problems it solves become actual problems for me.

The key features (see their front page), are speed, efficiency, and strictness. These are great features, but I don't actually need to solve them at the cost of adding extra tooling.

It is faster than NPM. But, of the things that take a lot of time in my development process, running package management commands really isn't high on the list. Testing is probably number one, then linting, then building, etc. Fully restoring all packages might take longer using NPM, but I don't do that often. Even when I do, it's fine if it takes a few minutes. I can go get a coffee or something. Even my GitHub actions can reuse the NPM cache.

It's more efficient than NPM with regards to disk space. But, I haven't run out of disk space in... a long time. SSDs are now large and fast. This probably isn't going to become more of an issue in the future.

The package structure it creates prevents you from using dependencies that you haven't declared. This is a great feature. But, I already have that with ESLint. It's the feature that I would really consider using PNPM for. But, since it's already solved by a tool that I definitely already need for other reasons, I don't need to add PNPM to solve it.

The only problems I have with PNPM are the following:

- It's not extensible.
- It has no versioning support built in.
- The exec command does not prefix output with the workspace name.

## And Others

I won't claim to have used every monorepo management option out there. But I've used a few, and there are reasons I never used them long, or for more than experiments.

[Rush](https://rushjs.io/), [Bit](https://bit.dev/), [Turborepo](https://turbo.build/), and Nx, are the other tools I've looked at for better monorepo management. My complaint about all of them can be summarized as: Does too much, and not transparently enough. Your mileage may vary.

Build caching and incremental builds are common features of these tools. But, in my experience the time savings isn't worth the complexity and fragility.

More efficient dependency management is also a feature in some of these tools, similar to PNPMs efficiency enhancements. But, I already mentioned why I don't need that. I also don't trust most of them to do it correctly, or in a way that doesn't create tool lock-in.

## Lerna-Lite Appears

What's this? Someone else didn't really want to jump on the Lerna+Nx/Nrwl train? I'm not alone!? Honestly, it feels like every developer is an island sometimes. Can't we agree on _anything?_

[Lerna-Lite](https://github.com/lerna-lite/lerna-lite) is for the people who were perfectly happy with Lerna before it was acquired. Not only is it exactly the Lerna we loved, but it's modular (sorta), in that you install only the commands you need.

The problems with Lerna-Lite are honestly small and I could use it. However, I wouldn't use the `version` or `publish` commands.

I wouldn't use the `version` command, because it uses the very common practice of tracking releases with Git tags. I don't like, and have never liked this strategy.

I also don't think the `publish` command is safe enough. In all that time I was writing my own monorepo management scripts around vanilla NPM and Yarn v1, one of the things I kept writing was pre-publish validation. For instance, I don't want to publish if my `package.json` file references build artifacts that don't actually exist.

Lerna-Lite is modular, so what if I could "fix" those commands, or replace them? But, even though it's modular, it's not actually extensible. The author broke the original code up into separate command packages, but there isn't a plugin architecture designed to allow for new/alternative commands that were not originally part of Lerna.

## Therefore, Wurk

Basically, I want Lerna-lite, but extensible. That way, when I (or others) are not happy with the way a command works, an alternative is possible that does not require throwing the baby out with the bathwater.

Having a single management tool also is useful beyond providing a lot of functionality in one place (which is arguably not good at all). I could use Lerna-Lite's `run` command to simply run purpose-built tools in each workspace. However, a single _extensible_ CLI makes installed commands discoverable and declarative. Discoverable because I know that every command I need to run is a `wurk` command, and I can get help for it with `wurk [command] --help`. It's also declarative. And declarative because I can run `wurk version` in two different projects, and the implementations might be different, but correct for each project.
