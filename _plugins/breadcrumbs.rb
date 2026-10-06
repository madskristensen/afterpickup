# frozen_string_literal: true

require "json"

module AfterPickup
  # BreadcrumbList for posts: Home, then the post. Stored as JSON so the
  # template can print it without building the graph in Liquid.
  class Breadcrumbs < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      root = site.config["url"].to_s.sub(%r{/\z}, "")

      site.posts.docs.each do |post|
        items = [
          { "name" => "Home", "item" => "#{root}/" },
          { "name" => post.data["title"].to_s, "item" => "#{root}#{post.url}" }
        ]
        post.data["breadcrumb_json"] = json_for(items, root, post.url)
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
