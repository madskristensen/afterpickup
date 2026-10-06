# frozen_string_literal: true

require "json"

module AfterPickup
  # BreadcrumbList for posts, topic pages, and guides. Stored as JSON
  # so the template can print it without building the graph in Liquid.
  class Breadcrumbs < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      root = site.config["url"].to_s.sub(%r{/\z}, "")

      site.posts.docs.each do |post|
        post.data["breadcrumb_json"] = json_for(post_items(post, site, root), root, post.url)
      end

      site.pages.each do |page|
        items = crumb_items(page, root)
        next unless items

        page.data["breadcrumb_json"] = json_for(items, root, page.url)
      end
    end

    def crumb_items(page, root)
      home = { "name" => "Home", "item" => "#{root}/" }
      here = { "name" => page.data["title"].to_s, "item" => "#{root}#{page.url}" }

      if page.data["topic_id"]
        return [home, here]
      end

      layout = page.data["layout"].to_s
      if layout == "guides" || page.url == "/guides/"
        return [home, here]
      end

      if layout == "guide"
        return [
          home,
          { "name" => "Guides", "item" => "#{root}/guides/" },
          here
        ]
      end

      nil
    end

    def post_items(post, site, root)
      items = [{ "name" => "Home", "item" => "#{root}/" }]
      topic = primary_topic(post, site)
      if topic
        items << {
          "name" => topic["title"].to_s,
          "item" => "#{root}/topics/#{topic['id']}/"
        }
      end
      items << { "name" => post.data["title"].to_s, "item" => "#{root}#{post.url}" }
      items
    end

    def primary_topic(post, site)
      tags = Array(post.data["tags"]).map(&:to_s)
      Array(site.data["topics"]).find do |topic|
        topic.is_a?(Hash) && (Array(topic["tags"]).map(&:to_s) & tags).any?
      end
    end

    def json_for(items, root, url)
      JSON.generate(
        "@context" => "https://schema.org",
        "@type" => "BreadcrumbList",
        "@id" => "#{root}#{url}#breadcrumb",
        "itemListElement" => items.each_with_index.map do |item, index|
          {
            "@type" => "ListItem",
            "position" => index + 1,
            "name" => item["name"],
            "item" => item["item"]
          }
        end
      )
    end
  end
end
